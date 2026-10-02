const express = require('express');
const { startService } = require('../shared');
const app = express();

const trains = [
    { id: 't-01', number: '12951', name: 'Mumbai Rajdhani', from: 'Mumbai Central', to: 'New Delhi', depart: '16:35', arrive: '08:35', duration: '16h 00m', class: '3A', price: 1840, seats: 18 },
    { id: 't-02', number: '12002', name: 'Bhopal Shatabdi', from: 'New Delhi', to: 'Bhopal Jn', depart: '06:00', arrive: '14:25', duration: '8h 25m', class: 'CC', price: 1320, seats: 26 },
    { id: 't-03', number: '12627', name: 'Karnataka Express', from: 'Bengaluru City', to: 'New Delhi', depart: '19:20', arrive: '10:30', duration: '39h 10m', class: 'SL', price: 780, seats: 42 }
];

app.get('/', (_req, res) => res.json({ trains }));
app.get('/:id', (req, res) => {
    const train = trains.find(item => item.id === req.params.id);
    if (!train) return res.status(404).json({ error: 'Train not found.' });
    res.json({ train });
});
startService(app, Number(process.env.PORT) || 4003);
