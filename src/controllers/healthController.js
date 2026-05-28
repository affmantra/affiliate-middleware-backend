const mongoose = require("mongoose");

const databaseStates = {
  0: "disconnected",
  1: "connected",
  2: "connecting",
  3: "disconnecting",
};

function getHealth(req, res) {
  res.status(200).json({
    success: true,
    data: {
      status: "ok",
      database: databaseStates[mongoose.connection.readyState] || "unknown",
      timestamp: new Date().toISOString(),
    },
  });
}

module.exports = { getHealth };
