// Wysyła równolegle 10 rejestracji tego samego emaila (każda inną wielkością liter).
// Oczekiwany wynik: jeden 201, dziewięć 409 EMAIL_TAKEN, żadnego 500.
const config = require("../src/config");

const URL = `http://localhost:${config.PORT}/api/auth/register`;
const variants = i => i % 2 ? "Rownolegly.Test@Example.com" : "rownolegly.test@example.com";

async function register(i) {
  const res = await fetch(URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: variants(i), password: "bardzo-dlugie-haslo" })
  });
  const json = await res.json();
  return { i, status: res.status, info: json.error ? json.error.code : `id=${json.id}` };
}

(async () => {
  const results = await Promise.all(Array.from({ length: 10 }, (_, i) => register(i + 1)));
  for (const r of results) console.log(`request ${String(r.i).padStart(2)}: ${r.status} ${r.info}`);
  const summary = results.reduce((acc, r) => ({ ...acc, [r.status]: (acc[r.status] ?? 0) + 1 }), {});
  console.log("podsumowanie:", summary);
})();
