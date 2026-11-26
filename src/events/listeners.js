const { EVENT_TYPES } = require("../modules/audit/audit.schemas");

// Każdy event trafia do tabeli audit_log
function registerAuditListener(eventBus, { runInTransaction }) {
  const save = event => runInTransaction(({ auditRepository }) =>
    auditRepository.create({ eventType: event.name, payload: event.payload, createdAt: event.occurredAt })
  );
  for (const eventType of EVENT_TYPES) eventBus.subscribe(eventType, save);
}

// Symulacja powiadomienia: ADMIN anulował cudzą rezerwację -> "mail" do właściciela
function registerNotificationListener(eventBus, { runInTransaction, log = console.log }) {
  eventBus.subscribe("reservation.cancelled", async ({ payload }) => {
    if (payload.cancelledBy === payload.userId) return;

    const { owner, canceller } = await runInTransaction(async ({ usersRepository }) => ({
      owner: await usersRepository.findById(payload.userId),
      canceller: await usersRepository.findById(payload.cancelledBy)
    }));
    if (canceller?.role !== "ADMIN" || !owner) return;

    log(`[notification] to: ${owner.email} - Twoja rezerwacja #${payload.reservationId} (sala ${payload.roomId}) została anulowana przez administratora`);
  });
}

module.exports = { registerAuditListener, registerNotificationListener };
