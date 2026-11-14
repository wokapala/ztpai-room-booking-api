const COLUMNS = ["rm.id", "rm.name", "rm.capacity", "rm.building_id", "b.name as building_name"];

function toRoom(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    capacity: row.capacity,
    buildingId: row.building_id,
    building: { id: row.building_id, name: row.building_name }
  };
}

function createRoomsRepository(db) {
  const withBuilding = () =>
    db("rooms as rm").join("buildings as b", "b.id", "rm.building_id").select(COLUMNS);

  return {
    async findAll() {
      const rows = await withBuilding().orderBy("rm.id");
      return rows.map(toRoom);
    },
    async findById(id) {
      return toRoom(await withBuilding().where("rm.id", id).first());
    },
    async findByBuilding(buildingId) {
      const rows = await withBuilding().where("rm.building_id", buildingId).orderBy("rm.id");
      return rows.map(toRoom);
    },
    async lockById(id) {
      await db("rooms").where({ id }).forUpdate().first();
    },
    async create({ buildingId, name, capacity }) {
      const [row] = await db("rooms").insert({ building_id: buildingId, name, capacity }).returning("id");
      return this.findById(row.id);
    },
    async update(id, changes) {
      const count = await db("rooms").where({ id }).update(changes);
      return count ? this.findById(id) : null;
    },
    async remove(id) {
      return (await db("rooms").where({ id }).del()) > 0;
    }
  };
}

module.exports = { createRoomsRepository };
