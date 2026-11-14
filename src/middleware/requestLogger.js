const { randomUUID } = require("node:crypto");

// log = funkcja wypisująca linię logu (w testach pusta, żeby nie zaśmiecać wyników)
function requestLogger(log = console.log) {
  return (req, res, next) => {
    req.id = req.get("X-Request-Id") || randomUUID();
    res.set("X-Request-Id", req.id);

    const start = process.hrtime.bigint();
    res.on("finish", () => {
      const ms = Number(process.hrtime.bigint() - start) / 1e6;
      log(`[${req.id}] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${ms.toFixed(1)} ms)`);
    });

    next();
  };
}

module.exports = requestLogger;
