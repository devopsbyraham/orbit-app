const express = require('express');
const bcrypt = require('bcryptjs');
const { pool, protect, signToken, startService } = require('../shared');

const app = express();
app.use(express.json({ limit: '20kb' }));

app.post('/register', async (req, res) => {
    const name = String(req.body.name || '').trim();
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    if (name.length < 2 || name.length > 90) return res.status(400).json({ error: 'Enter a name between 2 and 90 characters.' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'Enter a valid email address.' });
    if (password.length < 8) return res.status(400).json({ error: 'Use a password with at least 8 characters.' });
    const passwordHash = await bcrypt.hash(password, 12);
    try {
        const [result] = await pool.execute('INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)', [name, email, passwordHash]);
        const user = { id: result.insertId, name, email };
        res.status(201).json({ user, token: signToken(user) });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'An account with that email already exists.' });
        console.error(error);
        res.status(500).json({ error: 'Could not create account.' });
    }
});

app.post('/login', async (req, res) => {
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    const [rows] = await pool.execute('SELECT id, name, email, password_hash FROM users WHERE email = ? LIMIT 1', [email]);
    if (!rows.length || !await bcrypt.compare(password, rows[0].password_hash)) return res.status(401).json({ error: 'Email or password is incorrect.' });
    const user = { id: rows[0].id, name: rows[0].name, email: rows[0].email };
    res.json({ user, token: signToken(user) });
});

app.get('/me', protect, async (req, res) => {
    const [rows] = await pool.execute('SELECT id, name, email, created_at FROM users WHERE id = ? LIMIT 1', [req.user.id]);
    if (!rows.length) return res.status(404).json({ error: 'Account not found.' });
    res.json({ user: rows[0] });
});

startService(app, Number(process.env.PORT) || 4001, true);
