const bcrypt = require("bcryptjs");
const config = require("../../config");

const BCRYPT_ROUNDS = 12;

exports.seed = async function (knex) {
  if (!config.SEED_PASSWORD) throw new Error("Set SEED_PASSWORD in .env before running the seed");

  await knex.raw("TRUNCATE reservations, rooms, buildings, users RESTART IDENTITY CASCADE");

  const hash = () => bcrypt.hash(config.SEED_PASSWORD, BCRYPT_ROUNDS);
  await knex("users").insert([
    { email: "admin@example.com", password_hash: await hash(), role: "ADMIN", created_at: "2026-09-01T08:00:00Z" },
    { email: "anna.nowak@example.com", password_hash: await hash(), role: "USER", created_at: "2026-09-01T08:00:00Z" },
    { email: "marek.lewandowski@example.com", password_hash: await hash(), role: "USER", created_at: "2026-09-01T08:00:00Z" }
  ]);

  await knex("buildings").insert([
    { name: "Budynek A", address: "ul. Warszawska 24, Kraków", created_at: "2026-09-01T08:00:00Z" },
    { name: "Budynek B", address: "ul. Podchorążych 1, Kraków", created_at: "2026-09-01T08:00:00Z" }
  ]);

  await knex("rooms").insert([
    { building_id: 1, name: "101", capacity: 30, created_at: "2026-09-01T08:00:00Z" },
    { building_id: 1, name: "102", capacity: 20, created_at: "2026-09-01T08:00:00Z" },
    { building_id: 1, name: "201", capacity: 50, created_at: "2026-09-01T08:00:00Z" },
    { building_id: 2, name: "101", capacity: 25, created_at: "2026-09-01T08:00:00Z" },
    { building_id: 2, name: "Aula", capacity: 120, created_at: "2026-09-01T08:00:00Z" }
  ]);

  await knex("reservations").insert([
    // już się rozpoczęła
    { room_id: 2, user_id: 2, participants: 10, start_time: "2026-10-01T08:00:00Z", end_time: "2026-10-01T10:00:00Z", status: "CONFIRMED", created_at: "2026-09-20T12:00:00Z" },
    { room_id: 1, user_id: 2, participants: 20, start_time: "2026-12-10T10:00:00Z", end_time: "2026-12-10T12:00:00Z", status: "CONFIRMED", created_at: "2026-10-27T08:00:00Z" },
    // anulowana
    { room_id: 1, user_id: 3, participants: 15, start_time: "2026-12-12T08:00:00Z", end_time: "2026-12-12T10:00:00Z", status: "CANCELLED", cancelled_at: "2026-10-28T09:00:00Z", created_at: "2026-10-27T09:00:00Z" },
    { room_id: 4, user_id: 3, participants: 25, start_time: "2026-12-15T09:00:00Z", end_time: "2026-12-15T11:00:00Z", status: "CONFIRMED", created_at: "2026-10-28T10:00:00Z" },
    { room_id: 5, user_id: 2, participants: 100, start_time: "2026-12-20T12:00:00Z", end_time: "2026-12-20T16:00:00Z", status: "CONFIRMED", created_at: "2026-10-29T11:00:00Z" }
  ]);
};
