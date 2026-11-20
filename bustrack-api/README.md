# BusTrack India API

Express 5 + TypeScript + MongoDB (Mongoose) + MQTT GPS ingestion.

## Project layout

```
src/
  app.ts              Express app factory (middleware + routes)
  server.ts           Entrypoint: DB, HTTP, MQTT, simulator, graceful shutdown
  constants.ts        Roles, statuses, limits (single source of truth)
  config/             Env validation, logger, Mongo connection, JWT
  models/             Mongoose schemas (User, Route, Bus, Booking, LocationPing, DriverAccessRequest)
  validators/         Zod schemas for every request body and query
  middleware/         Auth/roles, error handling, rate limits, driver document uploads
  controllers/        HTTP layer: parse input, call a service, shape the response
  services/           Business rules and database work
  routes/             Route table per audience (auth, passenger, driver, admin)
  scripts/seed.ts     Demo routes, buses and accounts (development/test only)
  scripts/bootstrapAdmin.ts  One-time administrator bootstrap
  utils/              Errors, transactions, geo, MQTT parsing
tests/                node:test unit tests (pure logic, no database needed)
simulator/config.json GPS simulator tuning
private_uploads/      Driver documents (never served statically)
```

Dependency direction: routes → controllers → services → models. Services never touch `req`/`res`.

## Setup

Requirements: Node 20+, Docker (for MongoDB).

```bash
npm install                 # generate package-lock.json on the first install
cp .env.example .env            # set JWT_SECRET to a 32+ character random string

docker compose up -d mongo
docker compose exec mongo mongosh --eval "rs.initiate({_id:'rs0',members:[{_id:0,host:'localhost:27017'}]})"

npm run seed                    # demo routes, buses, admin and driver
npm run dev
```

**MongoDB must run as a replica set.** Seat booking uses multi-document transactions, which MongoDB only supports on replica sets. Atlas clusters are replica sets already.

Demo logins (development/test seed only): `admin@bustrack.local` / `Admin@12345`, `driver@bustrack.local` / `Driver@12345`. The seed command refuses to run when `NODE_ENV=production`.

Scripts: `npm run dev`, `npm run build && npm start`, `npm test`, `npm run typecheck`, `npm run seed`, `npm run bootstrap-admin`.

## Production deployment

1. Set `NODE_ENV=production`, a unique random `JWT_SECRET` (at least 32 characters), a TLS MongoDB URI (`mongodb+srv://` or `mongodb://...?tls=true`), and an exact comma-separated `CORS_ORIGIN` allowlist. Do not use `*`.
2. Configure a private MQTT broker. If `MQTT_ENABLED=true`, set `MQTT_BROKER_URL=mqtts://...`, `MQTT_USERNAME`, and `MQTT_PASSWORD`. Configure broker-side ACLs so each device can publish only its own bus topic and the API identity can subscribe only to the required location topic. Do not use a public anonymous broker for production GPS data.
3. Keep `GPS_SIMULATOR_ENABLED=false` in production. Store `.env` and uploaded driver documents outside source control; `private_uploads/` must not be exposed by the web server or reverse proxy. Terminate HTTPS at a trusted reverse proxy/load balancer.
4. On the first dependency install, run `npm install` and commit the generated `package-lock.json`; subsequent clean builds should use `npm ci && npm run build`, then start with `npm start`. Use a MongoDB replica set; transactions are required for booking and fleet assignment operations.
5. Create the first administrator once, using deployment secrets injected only for this command:

   ```bash
   ADMIN_BOOTSTRAP_NAME="System Administrator" \
   ADMIN_BOOTSTRAP_EMAIL="admin@your-domain.example" \
   ADMIN_BOOTSTRAP_PASSWORD="use-a-unique-12+-character-secret" \
   npm run bootstrap-admin
   ```

   The command refuses to create another admin when one already exists. Do not put the bootstrap password in source control or a persistent `.env` file.
6. Run `npm test`, `npm run typecheck`, and `npm run build` in CI before deployment. Back up MongoDB and private document storage, monitor `/health`, and rotate MQTT/JWT credentials on compromise.

**Operational note:** the included `express-rate-limit` memory store is suitable for a single API instance. Use a shared Redis-compatible rate-limit store before running multiple API replicas so limits cannot be bypassed by switching instances.

## Endpoints

All responses use `{ success, data }` or `{ success: false, message }`. Ids are 24-character Mongo ObjectIds, except bus ids (for example `DGP01-1`).

| Method | Path | Who | Notes |
| --- | --- | --- | --- |
| GET | `/health` | public | DB, MQTT and simulator status |
| POST | `/api/auth/register` | public | Passenger sign-up |
| POST | `/api/auth/login` | public | Drivers must be approved and assigned |
| GET | `/api/auth/me` | any role | Includes driver bus assignment |
| PUT | `/api/auth/password` | any role | **New** |
| POST | `/api/auth/driver-access-requests` | public | Multipart: `drivingLicense`, `aadhaarCard` images |
| GET | `/api/passenger/routes` | public | |
| GET | `/api/passenger/routes/:routeId` | public | **New** |
| GET | `/api/passenger/buses` | public | Live positions |
| GET | `/api/passenger/bus/:busId` | public | Stops, fares, booking status |
| GET | `/api/passenger/bus/:busId/history` | public | Last 2 hours |
| GET | `/api/passenger/bus/:busId/availability` | public | `fromStopIndex`, `toStopIndex` |
| GET | `/api/passenger/nearby` | public | `lat`, `lon`, `radius` |
| GET/PATCH | `/api/passenger/me` | passenger | PATCH is **new** (update name) |
| GET/POST/DELETE | `/api/passenger/favorites[/:busId]` | passenger | |
| GET/PUT | `/api/passenger/notification-preferences` | passenger | **New** |
| GET/POST | `/api/passenger/bookings` | passenger | |
| GET | `/api/passenger/bookings/:bookingId` | passenger | **New** |
| POST | `/api/passenger/bookings/:bookingId/cancel` | passenger | Same-day, confirmed only |
| GET | `/api/driver/me` | driver | |
| POST | `/api/driver/location` | driver | 202 Accepted |
| GET/PUT | `/api/driver/fares` | driver | |
| GET/PUT | `/api/driver/bookings/settings` | driver | |
| GET | `/api/driver/bookings` | driver | Today's bookings |
| POST | `/api/driver/bookings/:bookingId/board` | driver | |
| POST | `/api/driver/bookings/:bookingId/no-show` | driver | **New** |
| GET | `/api/admin/overview` | admin | |
| GET | `/api/admin/analytics?days=7\|30` | admin | |
| GET | `/api/admin/activity` | admin | |
| GET | `/api/admin/fleet` | admin | |
| GET/POST | `/api/admin/routes` | admin | |
| GET/PUT/DELETE | `/api/admin/routes/:routeId` | admin | GET, PUT and DELETE are **new** |
| GET | `/api/admin/buses/:busId` | admin | **New** |
| POST | `/api/admin/buses` | admin | |
| PATCH | `/api/admin/buses/:busId` | admin | label, capacity, route |
| PATCH | `/api/admin/buses/:busId/status` | admin | |
| PATCH | `/api/admin/buses/:busId/route` | admin | |
| DELETE | `/api/admin/buses/:busId` | admin | **New**; blocked while confirmed bookings exist |
| GET/POST | `/api/admin/drivers` | admin | |
| GET | `/api/admin/drivers/review` | admin | |
| PATCH | `/api/admin/drivers/:driverId` | admin | Rename, **new** |
| PUT | `/api/admin/drivers/:driverId/assignment` | admin | |
| PATCH | `/api/admin/drivers/:driverId/status` | admin | |
| DELETE | `/api/admin/drivers/:driverId` | admin | **New** |
| GET | `/api/admin/users` | admin | `role`, `q`, `page`, `limit`. **New** |
| GET | `/api/admin/bookings` | admin | `date`, `busId`, `status`, paging. **New** |
| GET | `/api/admin/driver-access-requests` | admin | |
| GET | `/api/admin/driver-access-requests/:id/documents/:type` | admin | Streams the image |
| POST | `.../:id/approve` and `.../:id/reject` | admin | |

## Changes from the MySQL version

- **Database:** MySQL tables became collections. Relationships are stored as references: a bus holds its `driverId`, and the driver-to-bus link is enforced by a partial unique index. Fares and booking settings are embedded in the bus document. Favourites and notification preferences are embedded in the user.
- **Latest position:** each bus carries `lastLocation`. The old `LEFT JOIN` query over location history is gone. History lives in `LocationPing`, which expires after `LOCATION_RETENTION_DAYS`.
- **Out-of-order GPS:** a late ping no longer overwrites a newer position.
- **Concurrency:** bookings and seat counts run in one transaction. A bus document is touched first, which serialises concurrent bookings on the same bus.
- **Security:** stored document filenames are never returned, and only `<uuid>.jpg|png` names are accepted. Image uploads are checked by their magic bytes. Request bodies and queries use strict Zod schemas, and login, registration, password-change and document submission endpoints are rate-limited. JWTs use issuer/audience/algorithm checks and are revalidated against current account role, driver approval and token version on each authenticated request. Password changes revoke previous tokens.
- **Behaviour changes to know about:**
  - Changing a bus's route clears its fares and turns bookings off. Fare pairs are stop indexes, so they are meaningless on another route.
  - Editing a route's stops clears fares on every bus using it.
  - The fleet response is camelCase (`busId`, `routeName`, …). The old version used snake_case keys there.
  - Route and bus ids were UUIDs and are now ObjectIds.
  - Seeded demo drivers are approved, so they can sign in straight away.

## Not included (next steps)

- A dedicated logout endpoint / refresh-token rotation. Access tokens are revoked on password change and account-state changes, and otherwise expire after `JWT_EXPIRES_IN`.
- Live tracking over Server-Sent Events or WebSockets. Clients currently poll `/api/passenger/buses`.
- Payment. Fares are collected on board, as before.
