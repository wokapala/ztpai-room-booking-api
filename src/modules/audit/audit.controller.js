const { toAuditEntryResponse } = require("./audit.mapper");

function createAuditController(auditService) {
  return {
    async list(req, res) {
      const { items, meta } = await auditService.listAuditLog(req.validated.query);
      res.json({ data: items.map(toAuditEntryResponse), meta });
    }
  };
}

module.exports = { createAuditController };
