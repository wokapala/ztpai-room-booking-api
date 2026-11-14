const toIso = value => (value ? new Date(value).toISOString() : null);

function toReservationResponse(reservation) {
  return {
    id: reservation.id,
    room: {
      id: reservation.room.id,
      name: reservation.room.name,
      building: { id: reservation.room.building.id, name: reservation.room.building.name }
    },
    user: { id: reservation.user.id, email: reservation.user.email },
    participants: reservation.participants,
    startTime: toIso(reservation.startTime),
    endTime: toIso(reservation.endTime),
    status: reservation.status,
    createdAt: toIso(reservation.createdAt),
    cancelledAt: toIso(reservation.cancelledAt)
  };
}

module.exports = { toReservationResponse };
