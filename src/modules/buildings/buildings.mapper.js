function toBuildingResponse(building) {
  return {
    id: building.id,
    name: building.name,
    address: building.address,
    roomsCount: building.roomsCount ?? 0
  };
}

module.exports = { toBuildingResponse };
