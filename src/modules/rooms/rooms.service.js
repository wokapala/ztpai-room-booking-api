const { NotFoundError } = require("../../errors/AppError");

function createRoomsService({ runInTransaction }) {
  async function listRooms() {
    return runInTransaction(({ roomsRepository }) => roomsRepository.findAll());
  }

  async function getRoom(id) {
    return runInTransaction(async ({ roomsRepository }) => {
      const room = await roomsRepository.findById(id);
      if (!room) throw new NotFoundError("Room");
      return room;
    });
  }

  async function createRoom(input) {
    return runInTransaction(async ({ buildingsRepository, roomsRepository }) => {
      const building = await buildingsRepository.findById(input.buildingId);
      if (!building) throw new NotFoundError("Building");
      return roomsRepository.create(input);
    });
  }

  async function updateRoom(id, changes) {
    return runInTransaction(async ({ roomsRepository }) => {
      const room = await roomsRepository.update(id, changes);
      if (!room) throw new NotFoundError("Room");
      return room;
    });
  }

  async function deleteRoom(id) {
    return runInTransaction(async ({ roomsRepository }) => {
      const deleted = await roomsRepository.remove(id);
      if (!deleted) throw new NotFoundError("Room");
    });
  }

  return { listRooms, getRoom, createRoom, updateRoom, deleteRoom };
}

module.exports = { createRoomsService };
