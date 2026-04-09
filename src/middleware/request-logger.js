const { logInfo } = require("../lib/logger");

function requestLogger(req, res, next) {
  const startTime = process.hrtime.bigint();

  res.on("finish", () => {
    const durationMs = Number(process.hrtime.bigint() - startTime) / 1000000;

    logInfo({
      method: req.method,
      path: req.originalUrl,
      status: res.statusCode,
      durationMs: Number(durationMs.toFixed(3)),
      requestId: req.requestId,
    });
  });

  next();
}

module.exports = requestLogger;
