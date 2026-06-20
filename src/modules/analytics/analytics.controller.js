const { getDashboardAnalytics } = require("./analytics.service");

async function dashboard(req, res) {
  const analytics = await getDashboardAnalytics(req.query);

  res.status(200).json({
    success: true,
    message: "Analytics dashboard loaded successfully.",
    data: analytics,
  });
}

module.exports = { dashboard };
