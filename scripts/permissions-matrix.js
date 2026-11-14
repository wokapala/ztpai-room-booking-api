// Tabela uprawnień z zadania 4 sprawdzana prawdziwymi requestami.
// Kolumny: brak tokenu / USER właściciel (anna) / USER obcy (marek) / ADMIN.
// Tworzy dane o stałych nazwach i terminach, więc uruchamiaj po świeżym: npx knex seed:run
const config = require("../src/config");

const BASE = `http://localhost:${config.PORT}/api`;
let counter = 0;

async function call(method, path, token, body) {
  const res = await fetch(BASE + path, {
    method,
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const text = await res.text();
  return { status: res.status, json: text ? JSON.parse(text) : null };
}

async function login(email) {
  const { json } = await call("POST", "/auth/login", null, { email, password: config.SEED_PASSWORD });
  return json.accessToken;
}

(async () => {
  const anna = await login("anna.nowak@example.com");
  const marek = await login("marek.lewandowski@example.com");
  const admin = await login("admin@example.com");
  const tokens = [null, anna, marek, admin];

  const uniq = () => `tmp-${++counter}`;
  const tmpBuilding = async () => (await call("POST", "/buildings", admin, { name: uniq(), address: "ul. Testowa 1" })).json.id;
  const tmpRoom = async () => (await call("POST", "/rooms", admin, { buildingId: await tmpBuilding(), name: uniq(), capacity: 10 })).json.id;
  const slot = () => {
    const n = ++counter;
    const day = String((n % 28) + 1).padStart(2, "0");
    const month = String((Math.floor(n / 28) % 12) + 1).padStart(2, "0");
    return { startTime: `2027-${month}-${day}T10:00:00Z`, endTime: `2027-${month}-${day}T12:00:00Z` };
  };
  const annaReservation = async () => (await call("POST", "/reservations", anna, { roomId: 3, participants: 5, ...slot() })).json.id;
  const fixedReservation = await annaReservation();

  // [opis, oczekiwane statusy, funkcja wykonująca request dla danego tokenu]
  const rows = [
    ["GET /api/auth/me", [401, 200, 200, 200], t => call("GET", "/auth/me", t)],
    ["GET /api/buildings", [401, 200, 200, 200], t => call("GET", "/buildings", t)],
    ["GET /api/buildings/:id", [401, 200, 200, 200], t => call("GET", "/buildings/1", t)],
    ["GET /api/buildings/:id/rooms", [401, 200, 200, 200], t => call("GET", "/buildings/1/rooms", t)],
    ["POST /api/buildings", [401, 403, 403, 201], t => call("POST", "/buildings", t, { name: uniq(), address: "ul. Testowa 1" })],
    ["PATCH /api/buildings/:id", [401, 403, 403, 200], async t => call("PATCH", `/buildings/${await tmpBuilding()}`, t, { address: "ul. Zmieniona 2" })],
    ["DELETE /api/buildings/:id", [401, 403, 403, 204], async t => call("DELETE", `/buildings/${await tmpBuilding()}`, t)],
    ["GET /api/rooms", [401, 200, 200, 200], t => call("GET", "/rooms", t)],
    ["GET /api/rooms/:id", [401, 200, 200, 200], t => call("GET", "/rooms/1", t)],
    ["POST /api/rooms", [401, 403, 403, 201], t => call("POST", "/rooms", t, { buildingId: 2, name: uniq(), capacity: 10 })],
    ["PATCH /api/rooms/:id", [401, 403, 403, 200], async t => call("PATCH", `/rooms/${await tmpRoom()}`, t, { capacity: 20 })],
    ["DELETE /api/rooms/:id", [401, 403, 403, 204], async t => call("DELETE", `/rooms/${await tmpRoom()}`, t)],
    ["GET /api/reservations", [401, 200, 200, 200], t => call("GET", "/reservations", t)],
    ["POST /api/reservations", [401, 201, 201, 201], t => call("POST", "/reservations", t, { roomId: 3, participants: 5, ...slot() })],
    ["GET /api/reservations/:id", [401, 200, 404, 200], t => call("GET", `/reservations/${fixedReservation}`, t)],
    ["PATCH /api/reservations/:id/cancel", [401, 200, 404, 200], async t => call("PATCH", `/reservations/${await annaReservation()}/cancel`, t)]
  ];

  const results = [];
  console.log(`${"Endpoint".padEnd(36)} ${"brak tokenu".padEnd(12)} ${"USER właśc.".padEnd(12)} ${"USER obcy".padEnd(12)} ${"ADMIN".padEnd(6)} zgodne`);
  for (const [name, expected, run] of rows) {
    const actual = [];
    for (const token of tokens) actual.push((await run(token)).status);
    const ok = actual.every((status, i) => status === expected[i]);
    results.push({ name, actual, expected, ok });
    console.log(`${name.padEnd(36)} ${String(actual[0]).padEnd(12)} ${String(actual[1]).padEnd(12)} ${String(actual[2]).padEnd(12)} ${String(actual[3]).padEnd(6)} ${ok ? "tak" : "NIE"}`);
  }

  process.exit(results.every(r => r.ok) ? 0 : 1);
})();
