const jwt = require("jsonwebtoken");
const { UnauthorizedError } = require("../errors/AppError");

function authenticate(jwtSecret) {
  return (req, res, next) => {
    const match = /^Bearer ([^\s]+)$/.exec(req.get("Authorization") ?? "");
    if (!match) return next(new UnauthorizedError());

    try {
      const payload = jwt.verify(match[1], jwtSecret, { algorithms: ["HS256"] });
      req.user = { id: Number(payload.sub), role: payload.role };
      next();
    } catch (err) {
      next(new UnauthorizedError(err.name === "TokenExpiredError" ? "Token expired" : "Invalid token"));
    }
  };
}

module.exports = authenticate;
