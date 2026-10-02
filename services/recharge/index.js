const express = require('express');
const { pool, protect, startService } = require('../shared');
const app = express();
app.use(express.json({ limit: '20kb' }));

const plans = [
    { id: 'r-01', provider: 'Jio', name: 'True 5G Daily', price: 299, validity: '28 days', data: '2 GB / day', calls: 'Unlimited' },
    { id: 'r-02', provider: 'Airtel', name: 'Unlimited Plus', price: 349, validity: '28 days', data: '2.5 GB / day', calls: 'Unlimited' },
    { id: 'r-03', provider: 'Vi', name: 'Hero Unlimited', price: 379, validity: '30 days', data: '2 GB / day', calls: 'Unlimited' },
    { id: 'r-04', provider: 'BSNL', name: 'Everyday Saver', price: 199, validity: '30 days', data: '2 GB / day', calls: 'Unlimited' }
];

app.get('/plans', (_req, res) => res.json({ plans }));
app.get('/orders', protect, async (req, res) => {
    const [orders] = await pool.execute(
        'SELECT id, phone, provider, plan_name AS planName, amount, status, created_at AS createdAt FROM recharge_orders WHERE user_id = ? ORDER BY created_at DESC LIMIT 50',
        [req.user.id]
    );
    res.json({ orders });
});

app.post('/orders', protect, async (req, res) => {
    const phone = String(req.body.phone || '').replace(/[\s-]/g, '');
    const plan = plans.find(item => item.id === req.body.planId);
    if (!/^\+?\d{10,15}$/.test(phone)) return res.status(400).json({ error: 'Enter a valid mobile number.' });
    if (!plan) return res.status(400).json({ error: 'Choose a valid recharge plan.' });
    const [result] = await pool.execute(
        'INSERT INTO recharge_orders (user_id, phone, provider, plan_name, amount) VALUES (?, ?, ?, ?, ?)',
        [req.user.id, phone, plan.provider, plan.name, plan.price]
    );
    res.status(201).json({ order: { id: result.insertId, phone, provider: plan.provider, plan: plan.name, amount: plan.price, status: 'successful' } });
});

startService(app, Number(process.env.PORT) || 4005, true);
