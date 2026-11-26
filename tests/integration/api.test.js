const request = require("supertest");
const config = require("../../src/config");
const db = require("../../src/db/knex");
const { createApp } = require("../../src/app");
const { createKnexUnitOfWork } = require("../../src/db/unitOfWork.knex");

// createApp bez app.listen() - Supertest wysyła requesty bezpośrednio do aplikacji
const app = createApp({ config, runInTransaction: createKnexUnitOfWork(db).runInTransaction });
const PASSWORD = "bardzo-dlugie-haslo";

async function registerAndLogin(email) {
  await request(app).post("/api/auth/register").send({ email, password: PASSWORD }).expect(201);
  const res = await request(app).post("/api/auth/login").send({ email, password: PASSWORD }).expect(200);
  return res.body.accessToken;
}

function createReservation(token, start, end, overrides = {}) {
  return request(app)
    .post("/api/reservations")
    .set("Authorization", `Bearer ${token}`)
    .send({ roomId: 1, participants: 10, startTime: start, endTime: end, ...overrides });
}

beforeAll(async () => {
  await db.migrate.latest();
});

beforeEach(async () => {
  await db.raw("TRUNCATE audit_log, reservations, rooms, buildings, users RESTART IDENTITY CASCADE");
  await db("buildings").insert({ name: "Budynek A", address: "ul. Testowa 1" });
  await db("rooms").insert([
    { building_id: 1, name: "101", capacity: 30 },
    { building_id: 1, name: "102", capacity: 20 }
  ]);
});

afterAll(async () => {
  await db.destroy();
});

describe("Auth", () => {
  test("rejestracja + logowanie + GET /api/auth/me", async () => {
    const register = await request(app)
      .post("/api/auth/register")
      .send({ email: "Jan.Kowalski@example.com", password: PASSWORD });
    expect(register.status).toBe(201);
    expect(register.body).toMatchObject({ email: "jan.kowalski@example.com", role: "USER" });
    expect(register.body).not.toHaveProperty("passwordHash");

    const login = await request(app)
      .post("/api/auth/login")
      .send({ email: "jan.kowalski@example.com", password: PASSWORD });
    expect(login.status).toBe(200);
    expect(login.body.tokenType).toBe("Bearer");

    const me = await request(app).get("/api/auth/me").set("Authorization", `Bearer ${login.body.accessToken}`);
    expect(me.status).toBe(200);
    expect(me.body).toEqual(register.body);
  });

  test("401 bez tokenu", async () => {
    const res = await request(app).get("/api/reservations");
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHORIZED");
  });
});

describe("Admin", () => {
  test("403 dla USER pobierającego audit log", async () => {
    const token = await registerAndLogin("jan@example.com");
    const res = await request(app).get("/api/admin/audit-log").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
  });
});

describe("Reservations", () => {
  test("POST /api/reservations -> 201, nagłówek Location i rekord w bazie", async () => {
    const token = await registerAndLogin("jan@example.com");
    const res = await createReservation(token, "2027-03-10T10:00:00Z", "2027-03-10T12:00:00Z");

    expect(res.status).toBe(201);
    expect(res.headers.location).toBe(`/api/reservations/${res.body.id}`);

    const row = await db("reservations").where({ id: res.body.id }).first();
    expect(row).toMatchObject({ room_id: 1, user_id: 1, participants: 10, status: "CONFIRMED" });
    expect(row.start_time.toISOString()).toBe("2027-03-10T10:00:00.000Z");
  });

  test("400 z poprawnymi details dla błędnego body", async () => {
    const token = await registerAndLogin("jan@example.com");
    const res = await createReservation(token, "2027-03-10T10:00:00Z", "jutro", { participants: -1, userId: 5 });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
    expect(res.body.error.details).toEqual(expect.arrayContaining([
      expect.objectContaining({ location: "body", field: "participants" }),
      expect.objectContaining({ location: "body", field: "endTime" }),
      expect.objectContaining({ location: "body", field: "userId" })
    ]));
  });

  test("403 dla USER próbującego utworzyć salę", async () => {
    const token = await registerAndLogin("jan@example.com");
    const res = await request(app)
      .post("/api/rooms")
      .set("Authorization", `Bearer ${token}`)
      .send({ buildingId: 1, name: "301", capacity: 10 });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
    expect(await db("rooms").count({ count: "*" }).first()).toEqual({ count: "2" });
  });

  test("404 dla USER pobierającego cudzą rezerwację", async () => {
    const janToken = await registerAndLogin("jan@example.com");
    const annaToken = await registerAndLogin("anna@example.com");
    const { body: created } = await createReservation(janToken, "2027-03-10T10:00:00Z", "2027-03-10T12:00:00Z").expect(201);

    const res = await request(app).get(`/api/reservations/${created.id}`).set("Authorization", `Bearer ${annaToken}`);
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("NOT_FOUND");
  });

  test("409 ROOM_ALREADY_BOOKED dla nakładającej się rezerwacji", async () => {
    const token = await registerAndLogin("jan@example.com");
    await createReservation(token, "2027-03-10T10:00:00Z", "2027-03-10T12:00:00Z").expect(201);

    const res = await createReservation(token, "2027-03-10T11:00:00Z", "2027-03-10T13:00:00Z");
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("ROOM_ALREADY_BOOKED");
    expect(await db("reservations").count({ count: "*" }).first()).toEqual({ count: "1" });
  });

  test("pagination: meta.total i liczba elementów w data przy limit mniejszym niż liczba rekordów", async () => {
    const token = await registerAndLogin("jan@example.com");
    for (const day of ["10", "11", "12"]) {
      await createReservation(token, `2027-03-${day}T10:00:00Z`, `2027-03-${day}T12:00:00Z`).expect(201);
    }

    const res = await request(app).get("/api/reservations?limit=2&page=1").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.meta).toEqual({ page: 1, limit: 2, total: 3, totalPages: 2 });
  });
});
