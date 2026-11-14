const { toUserResponse } = require("./auth.mapper");

function createAuthController(authService) {
  return {
    async register(req, res) {
      const user = await authService.register(req.validated.body);
      res.status(201).json(toUserResponse(user));
    },
    async login(req, res) {
      res.json(await authService.login(req.validated.body));
    },
    async me(req, res) {
      res.json(toUserResponse(await authService.getCurrentUser(req.user)));
    }
  };
}

module.exports = { createAuthController };
