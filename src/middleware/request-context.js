const crypto = require("node:crypto");

function requestContext(req, res, next) {
  req.requestId = crypto.randomUUID();
  res.setHeader("X-Request-Id", req.requestId);
  next();
}

module.exports = requestContext;
