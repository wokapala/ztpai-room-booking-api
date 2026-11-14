const bcrypt = require("bcryptjs");

// dane startowe dla repositories in-memory (te same co seed Knex)
module.exports = password => ({
  users: [
    { id: 1, email: "admin@example.com", passwordHash: bcrypt.hashSync(password, 12), role: "ADMIN", createdAt: new Date("2026-09-01T08:00:00Z") },
    { id: 2, email: "anna.nowak@example.com", passwordHash: bcrypt.hashSync(password, 12), role: "USER", createdAt: new Date("2026-09-01T08:00:00Z") },
    { id: 3, email: "marek.lewandowski@example.com", passwordHash: bcrypt.hashSync(password, 12), role: "USER", createdAt: new Date("2026-09-01T08:00:00Z") }
  ],
  buildings: [
    { id: 1, name: "Budynek A", address: "ul. Warszawska 24, Kraków" },
    { id: 2, name: "Budynek B", address: "ul. Podchorążych 1, Kraków" }
  ],
  rooms: [
    { id: 1, buildingId: 1, name: "101", capacity: 30 },
    { id: 2, buildingId: 1, name: "102", capacity: 20 },
    { id: 3, buildingId: 1, name: "201", capacity: 50 },
    { id: 4, buildingId: 2, name: "101", capacity: 25 },
    { id: 5, buildingId: 2, name: "Aula", capacity: 120 }
  ],
  reservations: [
    { id: 1, roomId: 2, userId: 2, participants: 10, startTime: new Date("2026-10-01T08:00:00Z"), endTime: new Date("2026-10-01T10:00:00Z"), status: "CONFIRMED", createdAt: new Date("2026-09-20T12:00:00Z"), cancelledAt: null },
    { id: 2, roomId: 1, userId: 2, participants: 20, startTime: new Date("2026-12-10T10:00:00Z"), endTime: new Date("2026-12-10T12:00:00Z"), status: "CONFIRMED", createdAt: new Date("2026-10-27T08:00:00Z"), cancelledAt: null },
    { id: 3, roomId: 1, userId: 3, participants: 15, startTime: new Date("2026-12-12T08:00:00Z"), endTime: new Date("2026-12-12T10:00:00Z"), status: "CANCELLED", createdAt: new Date("2026-10-27T09:00:00Z"), cancelledAt: new Date("2026-10-28T09:00:00Z") },
    { id: 4, roomId: 4, userId: 3, participants: 25, startTime: new Date("2026-12-15T09:00:00Z"), endTime: new Date("2026-12-15T11:00:00Z"), status: "CONFIRMED", createdAt: new Date("2026-10-28T10:00:00Z"), cancelledAt: null },
    { id: 5, roomId: 5, userId: 2, participants: 100, startTime: new Date("2026-12-20T12:00:00Z"), endTime: new Date("2026-12-20T16:00:00Z"), status: "CONFIRMED", createdAt: new Date("2026-10-29T11:00:00Z"), cancelledAt: null }
  ]
});
