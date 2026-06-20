const { exportLeadsCsv, getLeadDetails, listLeads } = require("./lead.service");

async function list(req, res) {
  const result = await listLeads(req.query);

  return res.success({
    message: "Leads fetched successfully.",
    data: result,
  });
}

async function details(req, res) {
  const lead = await getLeadDetails(req.params.id);

  return res.success({
    message: "Lead fetched successfully.",
    data: { lead },
  });
}

async function exportCsv(req, res) {
  const csv = await exportLeadsCsv(req.query);

  res.setHeader("content-type", "text/csv; charset=utf-8");
  res.setHeader("content-disposition", "attachment; filename=leads.csv");
  return res.status(200).send(csv);
}

module.exports = { details, exportCsv, list };
