const { createUsersRepository } = require("../modules/auth/users.repository.memory");
const { createBuildingsRepository } = require("../modules/buildings/buildings.repository.memory");
const { createRoomsRepository } = require("../modules/rooms/rooms.repository.memory");
const { createReservationsRepository } = require("../modules/reservations/reservations.repository.memory");

function createInMemoryUnitOfWork(seed = {}) {
  const state = {
    users: structuredClone(seed.users ?? []),
    buildings: structuredClone(seed.buildings ?? []),
    rooms: structuredClone(seed.rooms ?? []),
    reservations: structuredClone(seed.reservations ?? [])
  };

  const repositories = {
    usersRepository: createUsersRepository(state),
    buildingsRepository: createBuildingsRepository(state),
    roomsRepository: createRoomsRepository(state),
    reservationsRepository: createReservationsRepository(state)
  };

  // w pamięci nie ma czego cofać - funkcja jest po prostu wywoływana
  return { repositories, runInTransaction: fn => fn(repositories) };
}

module.exports = { createInMemoryUnitOfWork };
