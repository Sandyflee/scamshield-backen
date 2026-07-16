require("dotenv").config();
const express = require("express");
const cors = require("cors");

const analyzeRoute = require("./routes/analyze");
const reportsRoute = require("./routes/reports");
const statsRoute = require("./routes/stats");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors()); // for launch, fine to allow all origins; tighten to your domain once live
app.use(express.json({ limit: "10mb" })); // raised limit to allow base64 screenshots

app.get("/", (req, res) => {
  res.json({ status: "ScamShield backend is running." });
});

app.use("/api/analyze", analyzeRoute);
app.use("/api/reports", reportsRoute);
app.use("/api/stats", statsRoute);

app.listen(PORT, () => {
  console.log(`ScamShield backend listening on port ${PORT}`);
});
