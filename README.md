# Orbit

Orbit is a local full-stack consumer-services demo built from ten Compose containers: a static web frontend, Node.js API gateway, identity, movies, trains, DTH, recharge, bookings, notifications, and MySQL. It has working account creation/sign-in, browsable seeded catalogs, JWT-protected bookings and mobile recharge orders, account activity, and booking notifications.

## Run it

Requirements: Docker Desktop with Compose v2.

```sh
cp .env.example .env
# Change JWT_SECRET in .env before exposing the app beyond your machine.
docker compose up --build
```

Open `http://localhost:8080`. The gateway is also available at `http://localhost:3000`; MySQL maps to port `3306`. Stop with `Ctrl+C`, or run `docker compose down`. The `orbit_mysql` volume keeps account and transaction data between restarts. To remove all local data, use `docker compose down -v`.

Create an account from the UI, then browse movies and trains, choose DTH plans, place a mobile recharge, and review activity/notifications. Catalogs are seeded in service code. Checkout intentionally simulates confirmation and does not collect payment or contact external booking, telecom, or rail providers.

## Services

| Container | Responsibility | Port |
| --- | --- | --- |
| `frontend` | Responsive web app served by Nginx; proxies `/api` | 8080 |
| `gateway` | Routes `/api/*` to backend services | 3000 |
| `identity` | Registration, sign-in, JWTs, account profile | 4001 (internal) |
| `movies` | Movie catalog | 4002 (internal) |
| `trains` | Train catalog | 4003 (internal) |
| `dth` | DTH plan catalog | 4004 (internal) |
| `recharge` | Mobile plans and persisted recharge orders | 4005 (internal) |
| `bookings` | Price-verified bookings and booking history | 4006 (internal) |
| `notifications` | Persisted account notifications | 4007 (internal) |
| `mysql` | User, booking, recharge and notification data | 3306 |

Each backend has a `/health` endpoint. Backend service routes are mounted behind the gateway under `/api/auth`, `/api/movies`, `/api/trains`, `/api/dth`, `/api/recharge`, `/api/bookings`, and `/api/notifications`.

## Local development

Install Node.js 24 or newer, then run `npm install`. The service start scripts in `package.json` run individual backend processes; they require MySQL to be reachable at the connection settings in `services/shared.js`. For the complete user flow, use Compose so dependencies and service DNS are in place.

## Production notes

The included database passwords are for local development only. Set unique credentials and a long random `JWT_SECRET`, restrict public ports, use TLS, configure backups and migrations, and add a real payment/provider integration before handling money or live bookings. The seeded service catalog is illustrative, not live availability or pricing.
