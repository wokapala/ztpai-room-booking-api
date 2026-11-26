const errorResponse = description => ({
  description,
  content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } }
});
const ok = (description, schema) => ({ description, content: { "application/json": { schema } } });
const body = ref => ({
  required: true,
  content: { "application/json": { schema: { $ref: `#/components/schemas/${ref}` } } }
});
const ref = name => ({ $ref: `#/components/schemas/${name}` });
const list = name => ({ type: "array", items: ref(name) });
const idParam = { name: "id", in: "path", required: true, schema: { type: "integer", minimum: 1 } };

const E401 = errorResponse("Brak, zły lub wygasły token");
const E403 = errorResponse("Wymagana rola ADMIN");
const E400 = errorResponse("Niepoprawne dane (VALIDATION_ERROR) lub niepoprawny JSON (INVALID_JSON)");
const notFound = what => errorResponse(`${what} nie istnieje`);

const iso = { type: "string", format: "date-time" };

module.exports = {
  openapi: "3.0.3",
  info: {
    title: "Room Booking API",
    version: "4.0.0",
    description: "Zarządzanie budynkami, salami i rezerwacjami. Token z POST /api/auth/login wklej w Authorize."
  },
  security: [{ bearerAuth: [] }],
  tags: [{ name: "Auth" }, { name: "Buildings" }, { name: "Rooms" }, { name: "Reservations" }, { name: "Admin" }],
  components: {
    securitySchemes: {
      bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" }
    },
    schemas: {
      Error: {
        type: "object",
        required: ["error"],
        properties: {
          error: {
            type: "object",
            required: ["code", "message", "requestId"],
            properties: {
              code: { type: "string", description: "Stały identyfikator błędu, np. VALIDATION_ERROR, UNAUTHORIZED, FORBIDDEN, NOT_FOUND, EMAIL_TAKEN" },
              message: { type: "string" },
              details: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    location: { type: "string", enum: ["params", "query", "body"] },
                    field: { type: "string" },
                    message: { type: "string" }
                  }
                }
              },
              requestId: { type: "string" }
            }
          }
        }
      },
      RegisterRequest: {
        type: "object",
        additionalProperties: false,
        required: ["email", "password"],
        properties: {
          email: { type: "string", format: "email", example: "jan.kowalski@example.com" },
          password: { type: "string", minLength: 10, maxLength: 72, example: "bardzo-dlugie-haslo" }
        }
      },
      LoginRequest: {
        type: "object",
        additionalProperties: false,
        required: ["email", "password"],
        properties: {
          email: { type: "string", format: "email", example: "jan.kowalski@example.com" },
          password: { type: "string", example: "bardzo-dlugie-haslo" }
        }
      },
      LoginResponse: {
        type: "object",
        properties: {
          accessToken: { type: "string" },
          tokenType: { type: "string", example: "Bearer" },
          expiresIn: { type: "string", example: "15m" }
        }
      },
      User: {
        type: "object",
        properties: {
          id: { type: "integer" },
          email: { type: "string", format: "email" },
          role: { type: "string", enum: ["USER", "ADMIN"] },
          createdAt: iso
        }
      },
      Building: {
        type: "object",
        properties: {
          id: { type: "integer" },
          name: { type: "string" },
          address: { type: "string" },
          roomsCount: { type: "integer" }
        }
      },
      CreateBuildingRequest: {
        type: "object",
        additionalProperties: false,
        required: ["name", "address"],
        properties: {
          name: { type: "string", minLength: 2, maxLength: 120, example: "Budynek C" },
          address: { type: "string", minLength: 3, maxLength: 255, example: "ul. Nowa 5, Kraków" }
        }
      },
      UpdateBuildingRequest: {
        type: "object",
        additionalProperties: false,
        minProperties: 1,
        properties: {
          name: { type: "string", minLength: 2, maxLength: 120 },
          address: { type: "string", minLength: 3, maxLength: 255 }
        }
      },
      Room: {
        type: "object",
        properties: {
          id: { type: "integer" },
          name: { type: "string" },
          capacity: { type: "integer" },
          building: {
            type: "object",
            properties: { id: { type: "integer" }, name: { type: "string" } }
          }
        }
      },
      CreateRoomRequest: {
        type: "object",
        additionalProperties: false,
        required: ["buildingId", "name", "capacity"],
        properties: {
          buildingId: { type: "integer", minimum: 1, example: 1 },
          name: { type: "string", minLength: 1, maxLength: 50, example: "301" },
          capacity: { type: "integer", minimum: 1, example: 30 }
        }
      },
      UpdateRoomRequest: {
        type: "object",
        additionalProperties: false,
        minProperties: 1,
        properties: {
          name: { type: "string", minLength: 1, maxLength: 50 },
          capacity: { type: "integer", minimum: 1 }
        }
      },
      Reservation: {
        type: "object",
        properties: {
          id: { type: "integer" },
          room: {
            type: "object",
            properties: {
              id: { type: "integer" },
              name: { type: "string" },
              building: {
                type: "object",
                properties: { id: { type: "integer" }, name: { type: "string" } }
              }
            }
          },
          user: {
            type: "object",
            properties: { id: { type: "integer" }, email: { type: "string", format: "email" } }
          },
          participants: { type: "integer" },
          startTime: iso,
          endTime: iso,
          status: { type: "string", enum: ["CONFIRMED", "CANCELLED"] },
          createdAt: iso,
          cancelledAt: { ...iso, nullable: true }
        }
      },
      CreateReservationRequest: {
        type: "object",
        additionalProperties: false,
        required: ["roomId", "participants", "startTime", "endTime"],
        properties: {
          roomId: { type: "integer", minimum: 1, example: 1 },
          participants: { type: "integer", minimum: 1, example: 20 },
          startTime: { ...iso, example: "2027-01-10T10:00:00Z" },
          endTime: { ...iso, example: "2027-01-10T12:00:00Z" }
        }
      },
      AuditLogList: {
        type: "object",
        properties: {
          data: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id: { type: "integer" },
                eventType: { type: "string", enum: ["reservation.created", "reservation.cancelled"] },
                payload: { type: "object", additionalProperties: true },
                createdAt: iso
              }
            }
          },
          meta: {
            type: "object",
            properties: {
              page: { type: "integer" },
              limit: { type: "integer" },
              total: { type: "integer" },
              totalPages: { type: "integer" }
            }
          }
        }
      },
      ReservationList: {
        type: "object",
        properties: {
          data: list("Reservation"),
          meta: {
            type: "object",
            properties: {
              page: { type: "integer" },
              limit: { type: "integer" },
              total: { type: "integer" },
              totalPages: { type: "integer" }
            }
          }
        }
      }
    }
  },
  paths: {
    "/api/auth/register": {
      post: {
        tags: ["Auth"],
        summary: "Rejestracja (zawsze rola USER)",
        security: [],
        requestBody: body("RegisterRequest"),
        responses: {
          201: ok("Utworzony użytkownik", ref("User")),
          400: E400,
          409: errorResponse("Email zajęty (EMAIL_TAKEN)")
        }
      }
    },
    "/api/auth/login": {
      post: {
        tags: ["Auth"],
        summary: "Logowanie - zwraca token JWT",
        security: [],
        requestBody: body("LoginRequest"),
        responses: {
          200: ok("Token dostępu", ref("LoginResponse")),
          400: E400,
          401: errorResponse("Zły email lub hasło")
        }
      }
    },
    "/api/auth/me": {
      get: {
        tags: ["Auth"],
        summary: "Dane zalogowanego użytkownika",
        responses: { 200: ok("Użytkownik", ref("User")), 401: E401, 404: notFound("Użytkownik") }
      }
    },
    "/api/buildings": {
      get: {
        tags: ["Buildings"],
        summary: "Lista budynków z roomsCount",
        responses: { 200: ok("Budynki", list("Building")), 401: E401 }
      },
      post: {
        tags: ["Buildings"],
        summary: "Utworzenie budynku (ADMIN)",
        requestBody: body("CreateBuildingRequest"),
        responses: {
          201: ok("Utworzony budynek", ref("Building")),
          400: E400,
          401: E401,
          403: E403,
          409: errorResponse("Nazwa budynku zajęta (ALREADY_EXISTS)")
        }
      }
    },
    "/api/buildings/{id}": {
      parameters: [idParam],
      get: {
        tags: ["Buildings"],
        summary: "Jeden budynek",
        responses: { 200: ok("Budynek", ref("Building")), 400: E400, 401: E401, 404: notFound("Budynek") }
      },
      patch: {
        tags: ["Buildings"],
        summary: "Zmiana budynku (ADMIN)",
        requestBody: body("UpdateBuildingRequest"),
        responses: {
          200: ok("Zmieniony budynek", ref("Building")),
          400: E400,
          401: E401,
          403: E403,
          404: notFound("Budynek"),
          409: errorResponse("Nazwa budynku zajęta (ALREADY_EXISTS)")
        }
      },
      delete: {
        tags: ["Buildings"],
        summary: "Usunięcie budynku (ADMIN)",
        responses: {
          204: { description: "Usunięto" },
          400: E400,
          401: E401,
          403: E403,
          404: notFound("Budynek"),
          409: errorResponse("Budynek ma sale (FOREIGN_KEY_VIOLATION)")
        }
      }
    },
    "/api/buildings/{id}/rooms": {
      parameters: [idParam],
      get: {
        tags: ["Buildings"],
        summary: "Sale budynku",
        responses: { 200: ok("Sale", list("Room")), 400: E400, 401: E401, 404: notFound("Budynek") }
      }
    },
    "/api/rooms": {
      get: {
        tags: ["Rooms"],
        summary: "Lista sal",
        responses: { 200: ok("Sale", list("Room")), 401: E401 }
      },
      post: {
        tags: ["Rooms"],
        summary: "Utworzenie sali (ADMIN)",
        requestBody: body("CreateRoomRequest"),
        responses: {
          201: ok("Utworzona sala", ref("Room")),
          400: E400,
          401: E401,
          403: E403,
          404: notFound("Budynek"),
          409: errorResponse("Sala o tej nazwie już jest w budynku (ALREADY_EXISTS)")
        }
      }
    },
    "/api/rooms/{id}": {
      parameters: [idParam],
      get: {
        tags: ["Rooms"],
        summary: "Jedna sala z budynkiem",
        responses: { 200: ok("Sala", ref("Room")), 400: E400, 401: E401, 404: notFound("Sala") }
      },
      patch: {
        tags: ["Rooms"],
        summary: "Zmiana sali (ADMIN)",
        requestBody: body("UpdateRoomRequest"),
        responses: {
          200: ok("Zmieniona sala", ref("Room")),
          400: E400,
          401: E401,
          403: E403,
          404: notFound("Sala"),
          409: errorResponse("Sala o tej nazwie już jest w budynku (ALREADY_EXISTS)")
        }
      },
      delete: {
        tags: ["Rooms"],
        summary: "Usunięcie sali (ADMIN)",
        responses: {
          204: { description: "Usunięto" },
          400: E400,
          401: E401,
          403: E403,
          404: notFound("Sala"),
          409: errorResponse("Sala ma rezerwacje (FOREIGN_KEY_VIOLATION)")
        }
      }
    },
    "/api/reservations": {
      get: {
        tags: ["Reservations"],
        summary: "Lista rezerwacji (USER - tylko własne, ADMIN - wszystkie)",
        parameters: [
          { name: "userId", in: "query", description: "Tylko ADMIN; USER dostaje 403", schema: { type: "integer", minimum: 1 } },
          { name: "roomId", in: "query", schema: { type: "integer", minimum: 1 } },
          { name: "buildingId", in: "query", schema: { type: "integer", minimum: 1 } },
          { name: "status", in: "query", schema: { type: "string", enum: ["CONFIRMED", "CANCELLED"] } },
          { name: "from", in: "query", description: "Nakładanie się z [from, to)", schema: iso },
          { name: "to", in: "query", schema: iso },
          { name: "page", in: "query", schema: { type: "integer", minimum: 1, default: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", minimum: 1, maximum: 100, default: 20 } },
          {
            name: "sort",
            in: "query",
            schema: {
              type: "string",
              default: "startTime",
              enum: ["startTime", "-startTime", "createdAt", "-createdAt", "participants", "-participants"]
            }
          }
        ],
        responses: {
          200: ok("Strona rezerwacji", ref("ReservationList")),
          400: E400,
          401: E401,
          403: errorResponse("USER użył filtra userId")
        }
      },
      post: {
        tags: ["Reservations"],
        summary: "Utworzenie rezerwacji (właścicielem jest użytkownik z tokenu)",
        requestBody: body("CreateReservationRequest"),
        responses: {
          201: ok("Utworzona rezerwacja", ref("Reservation")),
          400: E400,
          401: E401,
          404: notFound("Sala"),
          409: errorResponse("ROOM_ALREADY_BOOKED lub ROOM_CAPACITY_EXCEEDED")
        }
      }
    },
    "/api/reservations/{id}": {
      parameters: [idParam],
      get: {
        tags: ["Reservations"],
        summary: "Jedna rezerwacja (właściciel lub ADMIN)",
        responses: {
          200: ok("Rezerwacja", ref("Reservation")),
          400: E400,
          401: E401,
          404: errorResponse("Rezerwacja nie istnieje lub należy do innego użytkownika")
        }
      }
    },
    "/api/reservations/{id}/cancel": {
      parameters: [idParam],
      patch: {
        tags: ["Reservations"],
        summary: "Anulowanie rezerwacji (właściciel lub ADMIN)",
        responses: {
          200: ok("Anulowana rezerwacja (operacja idempotentna)", ref("Reservation")),
          400: E400,
          401: E401,
          404: errorResponse("Rezerwacja nie istnieje lub należy do innego użytkownika"),
          409: errorResponse("Rezerwacja już się rozpoczęła (RESERVATION_ALREADY_STARTED)")
        }
      }
    },
    "/api/admin/audit-log": {
      get: {
        tags: ["Admin"],
        summary: "Dziennik zdarzeń (ADMIN), od najnowszych",
        parameters: [
          { name: "eventType", in: "query", schema: { type: "string", enum: ["reservation.created", "reservation.cancelled"] } },
          { name: "page", in: "query", schema: { type: "integer", minimum: 1, default: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", minimum: 1, maximum: 100, default: 20 } }
        ],
        responses: {
          200: ok("Strona wpisów audit logu", ref("AuditLogList")),
          400: E400,
          401: E401,
          403: E403
        }
      }
    }
  }
};
