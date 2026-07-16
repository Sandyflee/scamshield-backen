// Lightweight file-based store. Good enough for launch and low volume.
// IMPORTANT: Render's free tier has an EPHEMERAL filesystem — db.json will
// reset on every redeploy or restart. Fine for testing; before real launch,
// either add a Render persistent disk (paid) or migrate this module to a
// real database (Postgres via Render, or a free tier like Supabase/Neon).
// The rest of the app only talks to the functions below, so swapping the
// storage backend later means editing just this file.

const fs = require("fs");
const path = require("path");

const DB_PATH = path.join(__dirname, "db.json");

function loadDb() {
  if (!fs.existsSync(DB_PATH)) {
    const initial = { reportGroups: [], stats: { analyzed: 0, highRiskCount: 0, reportsByDate: {} } };
    fs.writeFileSync(DB_PATH, JSON.stringify(initial, null, 2));
    return initial;
  }
  return JSON.parse(fs.readFileSync(DB_PATH, "utf-8"));
}

function saveDb(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

function normalize(text) {
  return (text || "")
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, "[link]") // normalize URLs so slightly different links still group
    .replace(/\d{6,}/g, "[number]") // normalize long numbers (account numbers, phone numbers)
    .replace(/\s+/g, " ")
    .trim();
}

function recordAnalysis(riskLabel) {
  const data = loadDb();
  data.stats.analyzed += 1;
  if (riskLabel === "High Risk") data.stats.highRiskCount += 1;
  saveDb(data);
}

function addReport({ message, platform, category, country, notes }) {
  const data = loadDb();
  const fingerprint = normalize(message).slice(0, 300); // cap length used for matching

  let group = data.reportGroups.find(
    (g) => g.fingerprint === fingerprint && g.category === (category || "Other")
  );

  const today = new Date().toISOString().slice(0, 10);
  data.stats.reportsByDate[today] = (data.stats.reportsByDate[today] || 0) + 1;

  if (group) {
    group.reportCount += 1;
    group.lastSeen = new Date().toISOString();
    if (platform && !group.platforms.includes(platform)) group.platforms.push(platform);
    if (country && !group.countries.includes(country)) group.countries.push(country);
    if (notes) group.sampleNotes.push(notes.slice(0, 300));
  } else {
    group = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      fingerprint,
      title: message.slice(0, 80),
      category: category || "Other",
      description: message.slice(0, 400),
      reportCount: 1,
      platforms: platform ? [platform] : [],
      countries: country ? [country] : [],
      sampleNotes: notes ? [notes.slice(0, 300)] : [],
      firstSeen: new Date().toISOString(),
      lastSeen: new Date().toISOString(),
    };
    data.reportGroups.push(group);
  }

  saveDb(data);
  return group;
}

function getTrending({ category, search, threshold = 3 } = {}) {
  const data = loadDb();
  return data.reportGroups
    .filter((g) => g.reportCount >= threshold)
    .filter((g) => !category || g.category === category)
    .filter(
      (g) =>
        !search ||
        g.title.toLowerCase().includes(search.toLowerCase()) ||
        g.description.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => b.reportCount - a.reportCount);
}

function getStats() {
  const data = loadDb();
  const today = new Date().toISOString().slice(0, 10);
  return {
    analyzed: data.stats.analyzed,
    usersProtected: data.stats.highRiskCount, // proxy metric: analyses that came back High Risk
    reportsToday: data.stats.reportsByDate[today] || 0,
    totalReportGroups: data.reportGroups.length,
  };
}

module.exports = { recordAnalysis, addReport, getTrending, getStats };
