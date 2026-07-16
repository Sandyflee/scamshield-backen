const express = require("express");
const { SYSTEM_PROMPT } = require("../systemPrompt");
const { recordAnalysis } = require("../db");

const router = express.Router();

// Very basic in-memory rate limiting per IP, to protect your Anthropic
// spend from abuse. Fine for launch; swap for a real rate-limit
// middleware (e.g. express-rate-limit) once traffic grows.
const requestLog = new Map();
const MAX_REQUESTS_PER_WINDOW = 20;
const WINDOW_MS = 60 * 1000;

function isRateLimited(ip) {
  const now = Date.now();
  const timestamps = (requestLog.get(ip) || []).filter((t) => now - t < WINDOW_MS);
  timestamps.push(now);
  requestLog.set(ip, timestamps);
  return timestamps.length > MAX_REQUESTS_PER_WINDOW;
}

router.post("/", async (req, res) => {
  const ip = req.ip;
  if (isRateLimited(ip)) {
    return res.status(429).json({ error: "Too many requests. Please wait a moment and try again." });
  }

  const { platform, message, image } = req.body;

  if (!message?.trim() && !image) {
    return res.status(400).json({ error: "Provide a message or an image to analyze." });
  }

  try {
    const content = [];
    if (image?.mediaType && image?.dataBase64) {
      content.push({
        type: "image",
        source: { type: "base64", media_type: image.mediaType, data: image.dataBase64 },
      });
    }
    content.push({
      type: "text",
      text: `Platform: ${platform || "Unspecified"}\n\nMessage:\n${message || "(see attached screenshot)"}`,
    });

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1000,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content }],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Anthropic API error:", errText);
      return res.status(502).json({ error: "Analysis service is temporarily unavailable." });
    }

    const data = await response.json();
    const textBlock = data.content?.find((b) => b.type === "text");
    const cleaned = (textBlock?.text || "").replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(cleaned);

    recordAnalysis(parsed.riskLabel);
    res.json(parsed);
  } catch (err) {
    console.error("Analyze route error:", err);
    res.status(500).json({ error: "Something went wrong analyzing this. Try again in a moment." });
  }
});

module.exports = router;
