const express = require('express');
const { pool, protect, startService } = require('../shared');
const app = express();
app.use(express.json({ limit: '20kb' }));

app.post('/', protect, async (req, res) => {
    const title = String(req.body.title || '').slice(0, 140);
    const message = String(req.body.message || '').slice(0, 500);
    if (!title || !message) return res.status(400).json({ error: 'A title and message are required.' });
    const [result] = await pool.execute('INSERT INTO notifications (user_id, title, message) VALUES (?, ?, ?)', [req.user.id, title, message]);
    res.status(201).json({ notification: { id: result.insertId, title, message } });
});

app.get('/', protect, async (req, res) => {
    const [notifications] = await pool.execute(
        'SELECT id, title, message, created_at AS createdAt FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 30',
        [req.user.id]
    );
    res.json({ notifications });
});

startService(app, Number(process.env.PORT) || 4007, true);
