function createBuildingsRepository(state) {
  let nextId = Math.max(0, ...state.buildings.map(b => b.id)) + 1;

  const withRoomsCount = building => ({
    ...building,
    roomsCount: state.rooms.filter(r => r.buildingId === building.id).length
  });

  return {
    async findAll() {
      return state.buildings.map(withRoomsCount);
    },
    async findById(id) {
      const building = state.buildings.find(b => b.id === id);
      return building ? withRoomsCount(building) : null;
    },
    async create({ name, address }) {
      if (state.buildings.some(b => b.name === name)) {
        throw Object.assign(new Error("duplicate building name"), { code: "23505" });
      }
      const building = { id: nextId++, name, address };
      state.buildings.push(building);
      return withRoomsCount(building);
    },
    async update(id, changes) {
      const building = state.buildings.find(b => b.id === id);
      if (!building) return null;
      if (changes.name && state.buildings.some(b => b.id !== id && b.name === changes.name)) {
        throw Object.assign(new Error("duplicate building name"), { code: "23505" });
      }
      Object.assign(building, changes);
      return withRoomsCount(building);
    },
    async remove(id) {
      if (state.rooms.some(r => r.buildingId === id)) {
        throw Object.assign(new Error("building has rooms"), { code: "23503" });
      }
      const index = state.buildings.findIndex(b => b.id === id);
      if (index === -1) return false;
      state.buildings.splice(index, 1);
      return true;
    }
  };
}

module.exports = { createBuildingsRepository };
