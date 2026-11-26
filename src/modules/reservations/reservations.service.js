const { NotFoundError, ConflictError, ValidationError, ForbiddenError } = require("../../errors/AppError");
const { noopEventBus } = require("../../events/eventBus");

const MIN_DURATION_MS = 20 * 60 * 1000;
const MAX_DURATION_MS = 8 * 60 * 60 * 1000;

const ALLOWED_TRANSITIONS = {
  CONFIRMED: ["CANCELLED"],
  CANCELLED: []
};

// Przedziały półotwarte [start, end): A.start < B.end AND B.start < A.end
function overlaps(aStart, aEnd, bStart, bEnd) {
  return aStart < bEnd && bStart < aEnd;
}

// Rezerwacje są prywatne: dla obcego USERa zachowują się tak, jakby nie istniały (404, nie 403)
function assertCanAccess(reservation, currentUser) {
  const allowed = reservation && (currentUser.role === "ADMIN" || reservation.userId === currentUser.id);
  if (!allowed) throw new NotFoundError("Reservation");
}

function createReservationsService({ runInTransaction, eventBus = noopEventBus, now = () => new Date() }) {
  async function createReservation(input, currentUser) {
    const start = new Date(input.startTime).getTime();
    const end = new Date(input.endTime).getTime();
    const currentTime = now().getTime();

    if (end <= start) {
      throw new ValidationError([
        { location: "body", field: "endTime", message: "endTime must be later than startTime" }
      ]);
    }
    if (end - start < MIN_DURATION_MS || end - start > MAX_DURATION_MS) {
      throw new ValidationError([
        { location: "body", field: "endTime", message: "Reservation must last between 15 minutes and 8 hours" }
      ]);
    }
    if (start < currentTime) {
      throw new ValidationError([
        { location: "body", field: "startTime", message: "startTime cannot be in the past" }
      ]);
    }

    const reservation = await runInTransaction(async ({ roomsRepository, reservationsRepository }) => {
      const room = await roomsRepository.findById(input.roomId);
      if (!room) throw new NotFoundError("Room");

      // blokada wiersza sali do końca transakcji - równoległe rezerwacje tej sali czekają w kolejce
      await roomsRepository.lockById(room.id);

      if (input.participants > room.capacity) {
        throw new ConflictError("Room capacity exceeded", "ROOM_CAPACITY_EXCEEDED");
      }

      const active = await reservationsRepository.findActiveByRoom(room.id);
      const conflict = active.some(r =>
        overlaps(start, end, new Date(r.startTime).getTime(), new Date(r.endTime).getTime())
      );
      if (conflict) {
        throw new ConflictError("Room is already booked in this time range", "ROOM_ALREADY_BOOKED");
      }

      return reservationsRepository.create({
        roomId: room.id,
        userId: currentUser.id,
        participants: input.participants,
        startTime: new Date(start),
        endTime: new Date(end),
        status: "CONFIRMED",
        createdAt: new Date(currentTime),
        cancelledAt: null,
        internalNote: "created via API v2"
      });
    });

    // runInTransaction kończy się dopiero po COMMIT - błąd (np. 409) przerywa funkcję przed publish
    eventBus.publish("reservation.created", {
      reservationId: reservation.id,
      roomId: reservation.roomId,
      userId: reservation.userId,
      startTime: new Date(reservation.startTime).toISOString(),
      endTime: new Date(reservation.endTime).toISOString()
    });
    return reservation;
  }

  async function getReservation(id, currentUser) {
    return runInTransaction(async ({ reservationsRepository }) => {
      const reservation = await reservationsRepository.findById(id);
      assertCanAccess(reservation, currentUser);
      return reservation;
    });
  }

  async function listReservations(query, currentUser) {
    if (currentUser.role !== "ADMIN" && query.userId !== undefined) {
      throw new ForbiddenError("Only ADMIN can filter reservations by userId");
    }
    // USER widzi tylko swoje rezerwacje - filtr dokłada backend, niezależnie od parametrów query
    const filters = currentUser.role === "ADMIN" ? query : { ...query, userId: currentUser.id };

    return runInTransaction(async ({ reservationsRepository }) => {
      const { items, total } = await reservationsRepository.list(filters);
      return {
        items,
        meta: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) }
      };
    });
  }

  async function cancelReservation(id, currentUser) {
    let changed = false;
    const cancelled = await runInTransaction(async ({ reservationsRepository }) => {
      const reservation = await reservationsRepository.findById(id);
      assertCanAccess(reservation, currentUser);

      // ponowne anulowanie - idempotentne, bez zmian (i bez eventu)
      if (reservation.status === "CANCELLED") return reservation;

      if (!ALLOWED_TRANSITIONS[reservation.status].includes("CANCELLED")) {
        throw new ConflictError(
          `Cannot change status from ${reservation.status} to CANCELLED`,
          "INVALID_STATUS_TRANSITION"
        );
      }
      if (new Date(reservation.startTime).getTime() <= now().getTime()) {
        throw new ConflictError("Reservation has already started", "RESERVATION_ALREADY_STARTED");
      }

      changed = true;
      return reservationsRepository.update(id, { status: "CANCELLED", cancelledAt: now() });
    });

    if (changed) {
      eventBus.publish("reservation.cancelled", {
        reservationId: cancelled.id,
        roomId: cancelled.roomId,
        userId: cancelled.userId,
        cancelledBy: currentUser.id
      });
    }
    return cancelled;
  }

  return { createReservation, getReservation, listReservations, cancelReservation };
}

module.exports = { createReservationsService, ALLOWED_TRANSITIONS };
