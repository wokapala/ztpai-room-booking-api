const { createReservationsService } = require("../../src/modules/reservations/reservations.service");
const { createInMemoryUnitOfWork } = require("../../src/db/unitOfWork.memory");
const { createEventBus } = require("../../src/events/eventBus");

const NOW = new Date("2026-12-01T12:00:00Z");
const owner = { id: 2, role: "USER" };
const admin = { id: 1, role: "ADMIN" };

const existing = {
  id: 1, roomId: 1, userId: owner.id, participants: 10,
  startTime: new Date("2026-12-10T10:00:00Z"), endTime: new Date("2026-12-10T12:00:00Z"),
  status: "CONFIRMED", createdAt: NOW, cancelledAt: null
};

function setup({ reservations = [] } = {}) {
  const calls = [];
  const uow = createInMemoryUnitOfWork({
    users: [{ id: 1, email: "admin@example.com", role: "ADMIN" }, { id: 2, email: "anna@example.com", role: "USER" }],
    buildings: [{ id: 1, name: "Budynek A", address: "ul. Testowa 1" }],
    rooms: [{ id: 1, buildingId: 1, name: "101", capacity: 20 }],
    reservations
  });
  // zapisujemy moment "zatwierdzenia transakcji", żeby sprawdzić kolejność commit -> publish
  const runInTransaction = async fn => {
    const result = await uow.runInTransaction(fn);
    calls.push("commit");
    return result;
  };
  const eventBus = { publish: jest.fn(() => calls.push("publish")), subscribe: jest.fn() };
  const service = createReservationsService({ runInTransaction, eventBus, now: () => NOW });
  return { service, eventBus, calls };
}

const input = { roomId: 1, participants: 10, startTime: "2026-12-11T10:00:00Z", endTime: "2026-12-11T12:00:00Z" };

describe("eventy rezerwacji", () => {
  test("po udanym utworzeniu publikuje reservation.created - po zatwierdzeniu transakcji", async () => {
    const { service, eventBus, calls } = setup();
    const created = await service.createReservation(input, owner);

    expect(eventBus.publish).toHaveBeenCalledTimes(1);
    expect(eventBus.publish).toHaveBeenCalledWith("reservation.created", {
      reservationId: created.id,
      roomId: 1,
      userId: owner.id,
      startTime: "2026-12-11T10:00:00.000Z",
      endTime: "2026-12-11T12:00:00.000Z"
    });
    expect(calls).toEqual(["commit", "publish"]);
  });

  test("nieudana operacja (409 ROOM_ALREADY_BOOKED) nie publikuje eventu", async () => {
    const { service, eventBus } = setup({ reservations: [existing] });
    await expect(service.createReservation({ ...input, startTime: "2026-12-10T11:00:00Z", endTime: "2026-12-10T13:00:00Z" }, owner))
      .rejects.toMatchObject({ code: "ROOM_ALREADY_BOOKED" });
    expect(eventBus.publish).not.toHaveBeenCalled();
  });

  test("anulowanie publikuje reservation.cancelled, ponowne anulowanie już nie", async () => {
    const { service, eventBus } = setup({ reservations: [existing] });
    await service.cancelReservation(1, admin);
    await service.cancelReservation(1, admin);

    expect(eventBus.publish).toHaveBeenCalledTimes(1);
    expect(eventBus.publish).toHaveBeenCalledWith("reservation.cancelled", {
      reservationId: 1, roomId: 1, userId: owner.id, cancelledBy: admin.id
    });
  });

  test("odrzucone anulowanie (rezerwacja już się rozpoczęła) nie publikuje eventu", async () => {
    const { service, eventBus } = setup({
      reservations: [{ ...existing, startTime: new Date("2026-12-01T11:00:00Z"), endTime: new Date("2026-12-01T13:00:00Z") }]
    });
    await expect(service.cancelReservation(1, owner)).rejects.toMatchObject({ code: "RESERVATION_ALREADY_STARTED" });
    expect(eventBus.publish).not.toHaveBeenCalled();
  });
});

describe("eventBus", () => {
  test("błąd listenera nie przerywa publish i trafia do onError", async () => {
    const onError = jest.fn();
    const bus = createEventBus({ onError });
    const healthy = jest.fn();
    bus.subscribe("reservation.created", () => { throw new Error("audit failed"); });
    bus.subscribe("reservation.created", healthy);

    expect(() => bus.publish("reservation.created", { reservationId: 1 })).not.toThrow();
    await new Promise(resolve => setImmediate(resolve));

    expect(healthy).toHaveBeenCalledWith(expect.objectContaining({ name: "reservation.created", payload: { reservationId: 1 } }));
    expect(onError).toHaveBeenCalledWith("reservation.created", expect.objectContaining({ message: "audit failed" }));
  });
});
