const express = require("express");
const swaggerUi = require("swagger-ui-express");
const openapiDocument = require("./docs/openapi");
const requestLogger = require("./middleware/requestLogger");
const authenticate = require("./middleware/authenticate");
const notFound = require("./middleware/notFound");
const errorHandler = require("./middleware/errorHandler");
const { createAuthService } = require("./modules/auth/auth.service");
const { createAuthController } = require("./modules/auth/auth.controller");
const { createAuthRouter } = require("./modules/auth/auth.routes");
const { createBuildingsService } = require("./modules/buildings/buildings.service");
const { createBuildingsController } = require("./modules/buildings/buildings.controller");
const { createBuildingsRouter } = require("./modules/buildings/buildings.routes");
const { createRoomsService } = require("./modules/rooms/rooms.service");
const { createRoomsController } = require("./modules/rooms/rooms.controller");
const { createRoomsRouter } = require("./modules/rooms/rooms.routes");
const { createReservationsService } = require("./modules/reservations/reservations.service");
const { createReservationsController } = require("./modules/reservations/reservations.controller");
const { createReservationsRouter } = require("./modules/reservations/reservations.routes");

function createApp({ config, runInTransaction, now }) {
  const app = express();

  app.use(requestLogger);
  app.use(express.json());

  const requireAuth = authenticate(config.JWT_SECRET);

  const authService = createAuthService({
    runInTransaction,
    jwtSecret: config.JWT_SECRET,
    jwtExpiresIn: config.JWT_EXPIRES_IN
  });
  const buildingsService = createBuildingsService({ runInTransaction });
  const roomsService = createRoomsService({ runInTransaction });
  const reservationsService = createReservationsService({ runInTransaction, now });

  // publiczne: /api/docs, /api/auth/register, /api/auth/login
  app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(openapiDocument));
  app.use("/api/auth", createAuthRouter(createAuthController(authService), requireAuth));

  // requireAuth na całym module - nie da się zapomnieć o nowym endpoincie
  app.use("/api/buildings", requireAuth, createBuildingsRouter(createBuildingsController(buildingsService)));
  app.use("/api/rooms", requireAuth, createRoomsRouter(createRoomsController(roomsService)));
  app.use("/api/reservations", requireAuth, createReservationsRouter(createReservationsController(reservationsService)));

  app.use(notFound);
  app.use(errorHandler);

  return app;
}

module.exports = { createApp };
