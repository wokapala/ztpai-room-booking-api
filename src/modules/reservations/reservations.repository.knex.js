const COLUMNS = [
  "r.id", "r.room_id", "r.user_id", "r.participants", "r.start_time", "r.end_time",
  "r.status", "r.created_at", "r.cancelled_at",
  "rm.name as room_name", "rm.building_id", "b.name as building_name", "u.email as user_email"
];

// whitelist sortowania: wartość z API -> kolumna w bazie
const SORT_COLUMNS = {
  startTime: "r.start_time",
  createdAt: "r.created_at",
  participants: "r.participants"
};

function toReservation(row) {
  if (!row) return null;
  return {
    id: row.id,
    roomId: row.room_id,
    room: {
      id: row.room_id,
      name: row.room_name,
      building: { id: row.building_id, name: row.building_name }
    },
    userId: row.user_id,
    user: { id: row.user_id, email: row.user_email },
    participants: row.participants,
    startTime: row.start_time,
    endTime: row.end_time,
    status: row.status,
    createdAt: row.created_at,
    cancelledAt: row.cancelled_at
  };
}

function createReservationsRepository(db) {
  // jedno zapytanie z JOIN-ami zamiast osobnych zapytań o salę, budynek i użytkownika (brak N+1)
  const withRelations = () =>
    db("reservations as r")
      .join("rooms as rm", "rm.id", "r.room_id")
      .join("buildings as b", "b.id", "rm.building_id")
      .join("users as u", "u.id", "r.user_id");

  return {
    async findById(id) {
      return toReservation(await withRelations().select(COLUMNS).where("r.id", id).first());
    },

    async findActiveByRoom(roomId) {
      const rows = await withRelations()
        .select(COLUMNS)
        .where({ "r.room_id": roomId, "r.status": "CONFIRMED" });
      return rows.map(toReservation);
    },

    async list({ userId, roomId, buildingId, status, from, to, page = 1, limit = 20, sort = "startTime" } = {}) {
      const base = withRelations().modify(qb => {
        if (userId) qb.where("r.user_id", userId);
        if (roomId) qb.where("r.room_id", roomId);
        if (buildingId) qb.where("rm.building_id", buildingId);
        if (status) qb.where("r.status", status);
        // nakładanie się z [from, to): start < to AND end > from
        if (to) qb.where("r.start_time", "<", new Date(to));
        if (from) qb.where("r.end_time", ">", new Date(from));
      });

      const desc = sort.startsWith("-");
      const column = SORT_COLUMNS[desc ? sort.slice(1) : sort];

      const [rows, { count }] = await Promise.all([
        base.clone()
          .select(COLUMNS)
          .orderBy(column, desc ? "desc" : "asc")
          .orderBy("r.id", "asc")
          .limit(limit)
          .offset((page - 1) * limit),
        base.clone().count({ count: "*" }).first()
      ]);

      return { items: rows.map(toReservation), total: Number(count) };
    },

    async create(data) {
      const [row] = await db("reservations")
        .insert({
          room_id: data.roomId,
          user_id: data.userId,
          participants: data.participants,
          start_time: data.startTime,
          end_time: data.endTime,
          status: data.status,
          created_at: data.createdAt,
          cancelled_at: data.cancelledAt
        })
        .returning("id");
      return this.findById(row.id);
    },

    async update(id, changes) {
      const columns = {};
      if (changes.status !== undefined) columns.status = changes.status;
      if (changes.cancelledAt !== undefined) columns.cancelled_at = changes.cancelledAt;
      await db("reservations").where({ id }).update(columns);
      return this.findById(id);
    }
  };
}

module.exports = { createReservationsRepository };
