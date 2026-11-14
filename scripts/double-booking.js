// Wysyła równolegle 10 identycznych requestów POST /api/reservations
// i sprawdza w bazie, ile rezerwacji CONFIRMED powstało dla tej sali i przedziału.
const config = require("../src/config");
const db = require("../src/db/knex");

const BASE = `http://localhost:${config.PORT}/api`;
const body = {
  roomId: 2,
  participants: 10,
  startTime: "2026-12-25T10:00:00.000Z",
  endTime: "2026-12-25T12:00:00.000Z"
};

async function login() {
  const res = await fetch(`${BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "anna.nowak@example.com", password: config.SEED_PASSWORD })
  });
  return (await res.json()).accessToken;
}

async function book(i, token) {
  const res = await fetch(`${BASE}/reservations`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(body)
  });
  const json = await res.json();
  return { i, status: res.status, info: json.error ? json.error.code : `id=${json.id}` };
}

(async () => {
  const token = await login();
  const results = await Promise.all(Array.from({ length: 10 }, (_, i) => book(i + 1, token)));
  for (const r of results) console.log(`request ${String(r.i).padStart(2)}: ${r.status} ${r.info}`);

  const summary = results.reduce((acc, r) => ({ ...acc, [r.status]: (acc[r.status] ?? 0) + 1 }), {});
  console.log("podsumowanie:", summary);

  const { count } = await db("reservations")
    .where({ room_id: body.roomId, status: "CONFIRMED" })
    .where("start_time", "<", body.endTime)
    .where("end_time", ">", body.startTime)
    .count({ count: "*" })
    .first();
  console.log(`rezerwacje CONFIRMED w bazie (sala ${body.roomId}, ${body.startTime} - ${body.endTime}): ${count}`);

  await db.destroy();
})();
