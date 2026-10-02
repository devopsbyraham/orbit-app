const http = require('node:http');
const express = require('express');
const { startService } = require('../shared');

const app = express();
app.get('/health', (_req, res) => res.json({ status: 'ok' }));
const routes = [
    ['/api/auth', 'IDENTITY_URL'],
    ['/api/movies', 'MOVIES_URL'],
    ['/api/trains', 'TRAINS_URL'],
    ['/api/dth', 'DTH_URL'],
    ['/api/recharge', 'RECHARGE_URL'],
    ['/api/bookings', 'BOOKINGS_URL'],
    ['/api/notifications', 'NOTIFICATIONS_URL']
];

app.use((req, res, next) => {
    const route = routes.find(([prefix]) => req.path === prefix || req.path.startsWith(`${prefix}/`));
    if (!route) return next();
    const upstream = process.env[route[1]];
    const path = req.originalUrl.slice(route[0].length) || '/';
    const target = new URL(path, upstream);
    const headers = { authorization: req.headers.authorization || '', 'content-type': req.headers['content-type'] || 'application/json' };
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => {
        const request = http.request(target, { method: req.method, headers }, response => {
            res.status(response.statusCode || 502);
            for (const [name, value] of Object.entries(response.headers)) {
                if (value && ['content-type', 'cache-control'].includes(name.toLowerCase())) res.setHeader(name, value);
            }
            response.pipe(res);
        });
        request.on('error', () => res.status(503).json({ error: 'This service is temporarily unavailable.' }));
        if (chunks.length) request.write(Buffer.concat(chunks));
        request.end();
    });
});

app.use((_req, res) => res.status(404).json({ error: 'Route not found.' }));
startService(app, Number(process.env.PORT) || 3000);
