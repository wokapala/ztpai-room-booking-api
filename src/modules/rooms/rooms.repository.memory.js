function createRoomsRepository(state) {
  let nextId = Math.max(0, ...state.rooms.map(r => r.id)) + 1;

  const withBuilding = room => {
    const building = state.buildings.find(b => b.id === room.buildingId);
    return { ...room, building: { id: building.id, name: building.name } };
  };

  return {
    async findAll() {
      return state.rooms.map(withBuilding);
    },
    async findById(id) {
      const room = state.rooms.find(r => r.id === id);
      return room ? withBuilding(room) : null;
    },
    async findByBuilding(buildingId) {
      return state.rooms.filter(r => r.buildingId === buildingId).map(withBuilding);
    },
    async lockById() {
      // w pamięci (jeden proces) nie ma czego blokować
    },
    async create({ buildingId, name, capacity }) {
      if (state.rooms.some(r => r.buildingId === buildingId && r.name === name)) {
        throw Object.assign(new Error("duplicate room name"), { code: "23505" });
      }
      const room = { id: nextId++, buildingId, name, capacity };
      state.rooms.push(room);
      return withBuilding(room);
    },
    async update(id, changes) {
      const room = state.rooms.find(r => r.id === id);
      if (!room) return null;
      if (changes.name && state.rooms.some(r => r.id !== id && r.buildingId === room.buildingId && r.name === changes.name)) {
        throw Object.assign(new Error("duplicate room name"), { code: "23505" });
      }
      Object.assign(room, changes);
      return withBuilding(room);
    },
    async remove(id) {
      if (state.reservations.some(r => r.roomId === id)) {
        throw Object.assign(new Error("room has reservations"), { code: "23503" });
      }
      const index = state.rooms.findIndex(r => r.id === id);
      if (index === -1) return false;
      state.rooms.splice(index, 1);
      return true;
    }
  };
}

module.exports = { createRoomsRepository };
