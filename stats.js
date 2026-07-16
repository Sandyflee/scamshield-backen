const express = require("express");
const { getStats } = require("../db");

const router = express.Router();

router.get("/", (req, res) => {
  res.json(getStats());
});

module.exports = router;
