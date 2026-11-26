# Room Booking API

REST API do rezerwacji sal: budynki, sale, rezerwacje, użytkownicy z rolami `USER` / `ADMIN`.
Projekt na przedmiot ZTPAI.

**Stack:** Node.js 22, Express 5, PostgreSQL 16, Knex, Zod, JWT, Jest + Supertest, Docker Compose.

## Uruchomienie od zera (Docker)

Wymagany jest tylko Docker (Docker Desktop albo Docker Engine z Compose v2).

```bash
git clone https://github.com/wokapala/ztpai-room-booking-api.git
cd ztpai-room-booking-api
cp .env.example .env
docker compose up --build
```

Po chwili:

- API: http://localhost:3000/api
- Swagger UI: http://localhost:3000/api/docs

Migracje bazy wykonują się automatycznie przy starcie kontenera `api`.
Wartości z `.env.example` wystarczą do uruchomienia lokalnie; poza własnym komputerem ustaw własny `JWT_SECRET` i hasła.

### Dane przykładowe i konto ADMIN

W drugim terminalu (kontenery muszą działać):

```bash
docker compose exec api npx knex seed:run
```

Seed tworzy budynki, sale, rezerwacje i konta:

| Email | Rola |
|---|---|
| `admin@example.com` | ADMIN |
| `anna.nowak@example.com` | USER |
| `marek.lewandowski@example.com` | USER |

Hasło wszystkich kont to wartość `SEED_PASSWORD` z pliku `.env`. Kont ADMIN nie da się utworzyć przez API.

Token pobierzesz przez `POST /api/auth/login`, a w Swagger UI wkleisz go w **Authorize**.

### Zatrzymanie

```bash
docker compose down      # dane bazy zostają w volume
docker compose down -v   # razem z danymi
```

## Testy

Testy integracyjne korzystają z osobnej bazy `roombooking_test` (tworzonej automatycznie), nigdy z deweloperskiej.

```bash
npm ci
docker compose up -d db
npm test                  # unit + integration
npm run test:unit         # tylko unit (nie potrzebują bazy)
npm run test:integration  # tylko integracyjne
```

## Uruchomienie bez Dockera dla API

```bash
docker compose up -d db
npx knex migrate:latest
npx knex seed:run
npm start
```

## Konfiguracja

Wszystkie zmienne są opisane w `.env.example` i walidowane przy starcie (`src/config`).
Przy brakującej lub niepoprawnej zmiennej aplikacja nie startuje i wypisuje, co jest nie tak.

## Struktura

```text
src/
├── app.js, server.js     # budowa aplikacji / start, graceful shutdown
├── config/               # walidacja zmiennych środowiskowych
├── db/                   # Knex, migracje, seedy, unit of work
├── docs/                 # OpenAPI (Swagger UI)
├── errors/, middleware/
└── modules/              # auth, buildings, rooms, reservations
tests/
├── unit/                 # service + repositories in-memory
└── integration/          # Supertest + PostgreSQL
```
