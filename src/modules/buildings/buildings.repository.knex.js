function toBuilding(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    address: row.address,
    roomsCount: Number(row.rooms_count ?? 0)
  };
}

function createBuildingsRepository(db) {
  // LEFT JOIN + GROUP BY: budynki bez sal też są zwracane (roomsCount = 0)
  const withRoomsCount = () =>
    db("buildings as b")
      .leftJoin("rooms as rm", "rm.building_id", "b.id")
      .select("b.id", "b.name", "b.address")
      .count({ rooms_count: "rm.id" })
      .groupBy("b.id");

  return {
    async findAll() {
      const rows = await withRoomsCount().orderBy("b.id");
      return rows.map(toBuilding);
    },
    async findById(id) {
      return toBuilding(await withRoomsCount().where("b.id", id).first());
    },
    async create({ name, address }) {
      const [row] = await db("buildings").insert({ name, address }).returning(["id", "name", "address"]);
      return toBuilding(row);
    },
    async update(id, changes) {
      const count = await db("buildings").where({ id }).update(changes);
      return count ? this.findById(id) : null;
    },
    async remove(id) {
      return (await db("buildings").where({ id }).del()) > 0;
    }
  };
}

module.exports = { createBuildingsRepository };
