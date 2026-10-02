const express = require('express');
const { pool, protect, startService } = require('../shared');
const app = express();
app.use(express.json({ limit: '20kb' }));

const catalogUrls = {
    movies: process.env.MOVIES_URL || 'http://movies:4002',
    trains: process.env.TRAINS_URL || 'http://trains:4003',
    dth: process.env.DTH_URL || 'http://dth:4004'
};

app.post('/', protect, async (req, res) => {
    const service = String(req.body.service || '');
    const itemId = String(req.body.itemId || '');
    const catalogUrl = catalogUrls[service];
    if (!catalogUrl || !itemId) return res.status(400).json({ error: 'Choose a valid item to book.' });
    const response = await fetch(catalogUrl);
    if (!response.ok) return res.status(503).json({ error: 'Could not verify catalog availability.' });
    const catalog = await response.json();
    const items = catalog.movies || catalog.trains || catalog.plans || [];
    const item = items.find(entry => entry.id === itemId);
    if (!item) return res.status(404).json({ error: 'That item is no longer available.' });
    const itemName = item.title || item.name;
    const amount = Number(item.price);
    const details = service === 'trains' ? { from: item.from, to: item.to, depart: item.depart } : {};
    const [result] = await pool.execute(
        'INSERT INTO bookings (user_id, service, item_name, details, amount) VALUES (?, ?, ?, ?, ?)',
        [req.user.id, service, itemName, JSON.stringify(details), amount]
    );
    const booking = { id: result.insertId, service, itemName, details, amount, status: 'confirmed' };
    fetch(`${process.env.NOTIFICATIONS_URL || 'http://notifications:4007'}/`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: req.headers.authorization },
        body: JSON.stringify({ userId: req.user.id, title: 'Booking confirmed', message: `${itemName} is confirmed. Your reference is OR-${result.insertId}.` })
    }).catch(error => console.error('Notification delivery failed:', error.message));
    res.status(201).json({ booking });
});

app.get('/', protect, async (req, res) => {
    const [rows] = await pool.execute(
        'SELECT id, service, item_name AS itemName, details, amount, status, created_at AS createdAt FROM bookings WHERE user_id = ? ORDER BY created_at DESC LIMIT 50',
        [req.user.id]
    );
    res.json({ bookings: rows.map(row => ({ ...row, details: typeof row.details === 'string' ? JSON.parse(row.details) : row.details })) });
});

startService(app, Number(process.env.PORT) || 4006, true);
