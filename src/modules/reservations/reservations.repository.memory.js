const SORT_FIELDS = { startTime: "startTime", createdAt: "createdAt", participants: "participants" };

function createReservationsRepository(state) {
  let nextId = Math.max(0, ...state.reservations.map(r => r.id)) + 1;

  const withRoom = reservation => {
    const room = state.rooms.find(r => r.id === reservation.roomId);
    const building = state.buildings.find(b => b.id === room.buildingId);
    const user = state.users.find(u => u.id === reservation.userId);
    return {
      ...reservation,
      user: { id: user.id, email: user.email },
      room: { id: room.id, name: room.name, building: { id: building.id, name: building.name } }
    };
  };
  const time = value => new Date(value).getTime();

  return {
    async findById(id) {
      const reservation = state.reservations.find(r => r.id === id);
      return reservation ? withRoom(reservation) : null;
    },

    async findActiveByRoom(roomId) {
      return state.reservations
        .filter(r => r.roomId === roomId && r.status === "CONFIRMED")
        .map(withRoom);
    },

    async list({ userId, roomId, buildingId, status, from, to, page = 1, limit = 20, sort = "startTime" } = {}) {
      const desc = sort.startsWith("-");
      const field = SORT_FIELDS[desc ? sort.slice(1) : sort];

      const matching = state.reservations
        .map(withRoom)
        .filter(r =>
          (!userId || r.userId === userId) &&
          (!roomId || r.roomId === roomId) &&
          (!buildingId || r.room.building.id === buildingId) &&
          (!status || r.status === status) &&
          (!to || time(r.startTime) < time(to)) &&
          (!from || time(r.endTime) > time(from))
        )
        .sort((a, b) => {
          const va = field === "participants" ? a[field] : time(a[field]);
          const vb = field === "participants" ? b[field] : time(b[field]);
          return (desc ? vb - va : va - vb) || a.id - b.id;
        });

      return { items: matching.slice((page - 1) * limit, page * limit), total: matching.length };
    },

    async create(data) {
      const reservation = { id: nextId++, ...data };
      state.reservations.push(reservation);
      return withRoom(reservation);
    },

    async update(id, changes) {
      const reservation = state.reservations.find(r => r.id === id);
      Object.assign(reservation, changes);
      return withRoom(reservation);
    }
  };
}

module.exports = { createReservationsRepository };
