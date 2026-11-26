const { Router } = require("express");
const validate = require("../../middleware/validate");
const { listAuditLogQuery } = require("./audit.schemas");

// montowane pod /api/admin z authenticate + authorize("ADMIN") w app.js
function createAdminRouter(auditController) {
  const router = Router();
  router.get("/audit-log", validate({ query: listAuditLogQuery }), auditController.list);
  return router;
}

module.exports = { createAdminRouter };
