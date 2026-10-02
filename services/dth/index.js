const express = require('express');
const { startService } = require('../shared');
const app = express();

const plans = [
    { id: 'd-01', provider: 'Tata Play', name: 'Family HD', price: 399, validity: '30 days', channels: '290+ channels', note: 'Popular' },
    { id: 'd-02', provider: 'Airtel Digital TV', name: 'Mega Pack', price: 499, validity: '30 days', channels: '350+ channels', note: 'Best value' },
    { id: 'd-03', provider: 'Dish TV', name: 'South Value', price: 299, validity: '30 days', channels: '220+ channels', note: 'Regional' },
    { id: 'd-04', provider: 'Sun Direct', name: 'HD Sports', price: 449, validity: '30 days', channels: '280+ channels', note: 'Sports' }
];

app.get('/', (_req, res) => res.json({ plans }));
app.get('/:id', (req, res) => {
    const plan = plans.find(item => item.id === req.params.id);
    if (!plan) return res.status(404).json({ error: 'Plan not found.' });
    res.json({ plan });
});
startService(app, Number(process.env.PORT) || 4004);
