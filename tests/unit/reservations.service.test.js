const { createReservationsService } = require("../../src/modules/reservations/reservations.service");
const { createInMemoryUnitOfWork } = require("../../src/db/unitOfWork.memory");

const NOW = new Date("2026-12-01T12:00:00Z");
const owner = { id: 2, role: "USER" };
const otherUser = { id: 3, role: "USER" };
const admin = { id: 1, role: "ADMIN" };

const at = (time, day = "2026-12-10") => `${day}T${time}:00Z`;
const reservation = (id, overrides = {}) => ({
  id,
  roomId: 1,
  userId: owner.id,
  participants: 10,
  startTime: new Date(at("10:00")),
  endTime: new Date(at("12:00")),
  status: "CONFIRMED",
  createdAt: new Date("2026-11-20T08:00:00Z"),
  cancelledAt: null,
  ...overrides
});

// Każdy test buduje własny, świeży stan - testy nie zależą od kolejności.
function setup({ reservations = [] } = {}) {
  let current = NOW;
  const { runInTransaction } = createInMemoryUnitOfWork({
    users: [
      { id: 1, email: "admin@example.com", role: "ADMIN" },
      { id: 2, email: "anna@example.com", role: "USER" },
      { id: 3, email: "marek@example.com", role: "USER" }
    ],
    buildings: [{ id: 1, name: "Budynek A", address: "ul. Testowa 1" }],
    rooms: [
      { id: 1, buildingId: 1, name: "101", capacity: 20 },
      { id: 2, buildingId: 1, name: "102", capacity: 20 }
    ],
    reservations
  });
  const service = createReservationsService({ runInTransaction, now: () => current });
  const setNow = date => { current = date; };
  return { service, setNow };
}

const input = (start, end, overrides = {}) => ({
  roomId: 1,
  participants: 10,
  startTime: start,
  endTime: end,
  ...overrides
});

describe("createReservation - nakładanie się przedziałów", () => {
  // istniejąca rezerwacja: sala 1, 10:00-12:00
  test.each([
    ["częściowe nakładanie od końca", "11:00", "13:00"],
    ["częściowe nakładanie od początku", "09:00", "11:00"],
    ["nowa zawiera istniejącą", "09:00", "13:00"],
    ["nowa zawiera się w istniejącej", "10:30", "11:00"]
  ])("odrzuca: %s (%s-%s)", async (_, start, end) => {
    const { service } = setup({ reservations: [reservation(1)] });
    await expect(service.createReservation(input(at(start), at(end)), owner))
      .rejects.toMatchObject({ code: "ROOM_ALREADY_BOOKED" });
  });

  test.each([
    ["styka się od końca", "12:00", "13:00"],
    ["styka się od początku", "08:00", "10:00"]
  ])("pozwala: %s (%s-%s)", async (_, start, end) => {
    const { service } = setup({ reservations: [reservation(1)] });
    await expect(service.createReservation(input(at(start), at(end)), owner))
      .resolves.toMatchObject({ status: "CONFIRMED" });
  });

  test("pozwala na ten sam przedział w innej sali", async () => {
    const { service } = setup({ reservations: [reservation(1)] });
    await expect(service.createReservation(input(at("10:00"), at("12:00"), { roomId: 2 }), owner))
      .resolves.toMatchObject({ roomId: 2, status: "CONFIRMED" });
  });

  test("anulowana rezerwacja nie blokuje przedziału", async () => {
    const { service } = setup({
      reservations: [reservation(1, { status: "CANCELLED", cancelledAt: new Date("2026-11-25T08:00:00Z") })]
    });
    await expect(service.createReservation(input(at("10:00"), at("12:00")), owner))
      .resolves.toMatchObject({ status: "CONFIRMED" });
  });
});

describe("createReservation - pojemność sali", () => {
  test("pozwala, gdy participants == capacity", async () => {
    const { service } = setup();
    await expect(service.createReservation(input(at("10:00"), at("12:00"), { participants: 20 }), owner))
      .resolves.toMatchObject({ participants: 20 });
  });

  test("odrzuca, gdy participants == capacity + 1", async () => {
    const { service } = setup();
    await expect(service.createReservation(input(at("10:00"), at("12:00"), { participants: 21 }), owner))
      .rejects.toMatchObject({ code: "ROOM_CAPACITY_EXCEEDED" });
  });
});

describe("createReservation - czas trwania", () => {
  test.each([
    ["dokładnie 15 min", "10:00", "10:15"],
    ["dokładnie 8 h", "08:00", "16:00"]
  ])("pozwala: %s", async (_, start, end) => {
    const { service } = setup();
    await expect(service.createReservation(input(at(start), at(end)), owner))
      .resolves.toMatchObject({ status: "CONFIRMED" });
  });

  test.each([
    ["14 min", "10:00", "10:14"],
    ["8 h 1 min", "08:00", "16:01"]
  ])("odrzuca: %s", async (_, start, end) => {
    const { service } = setup();
    await expect(service.createReservation(input(at(start), at(end)), owner))
      .rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });
});

describe("cancelReservation", () => {
  test("odrzuca anulowanie rozpoczętej rezerwacji", async () => {
    const { service } = setup({
      reservations: [reservation(1, { startTime: new Date("2026-12-01T11:00:00Z"), endTime: new Date("2026-12-01T13:00:00Z") })]
    });
    await expect(service.cancelReservation(1, owner))
      .rejects.toMatchObject({ code: "RESERVATION_ALREADY_STARTED" });
  });

  test("podwójne anulowanie jest idempotentne - cancelledAt się nie zmienia", async () => {
    const { service, setNow } = setup({ reservations: [reservation(1)] });
    const first = await service.cancelReservation(1, owner);
    setNow(new Date("2026-12-02T09:00:00Z"));
    const second = await service.cancelReservation(1, owner);

    expect(first.status).toBe("CANCELLED");
    expect(first.cancelledAt).toEqual(NOW);
    expect(second.cancelledAt).toEqual(NOW);
  });
});

describe("ownership", () => {
  test("obcy USER nie może anulować cudzej rezerwacji (404, rezerwacja bez zmian)", async () => {
    const { service } = setup({ reservations: [reservation(1)] });
    await expect(service.cancelReservation(1, otherUser)).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(service.getReservation(1, owner)).resolves.toMatchObject({ status: "CONFIRMED" });
  });

  test("obcy USER nie widzi cudzej rezerwacji", async () => {
    const { service } = setup({ reservations: [reservation(1)] });
    await expect(service.getReservation(1, otherUser)).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  test("ADMIN może anulować cudzą rezerwację", async () => {
    const { service } = setup({ reservations: [reservation(1)] });
    await expect(service.cancelReservation(1, admin)).resolves.toMatchObject({ status: "CANCELLED" });
  });

  test("USER na liście widzi tylko swoje rezerwacje", async () => {
    const { service } = setup({
      reservations: [reservation(1), reservation(2, { userId: otherUser.id, startTime: new Date(at("13:00")), endTime: new Date(at("14:00")) })]
    });
    const { items, meta } = await service.listReservations({ page: 1, limit: 20, sort: "startTime" }, owner);
    expect(items.map(r => r.id)).toEqual([1]);
    expect(meta.total).toBe(1);
  });

  test("właścicielem nowej rezerwacji jest użytkownik z tokenu", async () => {
    const { service } = setup();
    await expect(service.createReservation(input(at("10:00"), at("12:00")), otherUser))
      .resolves.toMatchObject({ userId: otherUser.id, user: { id: otherUser.id } });
  });
});
