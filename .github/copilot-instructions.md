# Orbit project notes

- The project is a ten-container Docker Compose app. Keep service boundaries and Compose names aligned with the README.
- Backend services use CommonJS, Express, and the shared helpers in `services/shared.js`; the frontend is static HTML/CSS/JavaScript served by Nginx.
- MySQL schema setup is in `database/init.sql`. User, booking, recharge, and notification data must remain server-side.
- Booking prices must be loaded from the owning catalog service, not trusted from frontend payloads.
- Never commit `.env` or real secrets. Checkout is a demo and must not be described as processing a payment.
- Use `docker compose up --build` for the integrated app. Confirm services with health endpoints and exercise account and booking flows after behavior changes.
