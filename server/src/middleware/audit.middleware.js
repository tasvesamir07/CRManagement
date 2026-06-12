const auditService = require('../services/audit.service');

function audit(action, entityType) {
  return (req, res, next) => {
    const originalJson = res.json.bind(res);
    res.json = function (body) {
      const entityId = req.params.id || body?.id || null;

      if (res.statusCode < 400) {
        auditService.log(
          req.user?.id,
          action,
          entityType,
          entityId,
          { body: req.body, params: req.params },
          req.ip
        );
      }

      return originalJson(body);
    };
    next();
  };
}

module.exports = { audit };
