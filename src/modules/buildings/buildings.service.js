const { NotFoundError } = require("../../errors/AppError");

function createBuildingsService({ runInTransaction }) {
  async function listBuildings() {
    return runInTransaction(({ buildingsRepository }) => buildingsRepository.findAll());
  }

  async function getBuilding(id) {
    return runInTransaction(async ({ buildingsRepository }) => {
      const building = await buildingsRepository.findById(id);
      if (!building) throw new NotFoundError("Building");
      return building;
    });
  }

  async function createBuilding(input) {
    return runInTransaction(({ buildingsRepository }) => buildingsRepository.create(input));
  }

  async function listBuildingRooms(id) {
    return runInTransaction(async ({ buildingsRepository, roomsRepository }) => {
      const building = await buildingsRepository.findById(id);
      if (!building) throw new NotFoundError("Building");
      return roomsRepository.findByBuilding(id);
    });
  }

  async function updateBuilding(id, changes) {
    return runInTransaction(async ({ buildingsRepository }) => {
      const building = await buildingsRepository.update(id, changes);
      if (!building) throw new NotFoundError("Building");
      return building;
    });
  }

  async function deleteBuilding(id) {
    return runInTransaction(async ({ buildingsRepository }) => {
      const deleted = await buildingsRepository.remove(id);
      if (!deleted) throw new NotFoundError("Building");
    });
  }

  return { listBuildings, getBuilding, createBuilding, listBuildingRooms, updateBuilding, deleteBuilding };
}

module.exports = { createBuildingsService };
