const express = require('express');
const { startService } = require('../shared');
const app = express();

const movies = [
    { id: 'm-01', title: 'The Last Light', genre: 'Drama', language: 'English', rating: 8.4, runtime: '2h 08m', price: 320, art: 'photo-1489599849927-2ee91cede3ba', color: 'red' },
    { id: 'm-02', title: 'Monsoon Letters', genre: 'Romance', language: 'Hindi', rating: 8.1, runtime: '2h 16m', price: 280, art: 'photo-1517604931442-7e0c8ed2963c', color: 'blue' },
    { id: 'm-03', title: 'Deep Blue', genre: 'Thriller', language: 'English', rating: 7.9, runtime: '1h 54m', price: 350, art: 'photo-1440404653325-ab127d49abc1', color: 'green' },
    { id: 'm-04', title: 'City of Echoes', genre: 'Action', language: 'Tamil', rating: 8.7, runtime: '2h 22m', price: 300, art: 'photo-1478720568477-152d9b164e26', color: 'amber' }
];

app.get('/', (_req, res) => res.json({ movies }));
app.get('/:id', (req, res) => {
    const movie = movies.find(item => item.id === req.params.id);
    if (!movie) return res.status(404).json({ error: 'Movie not found.' });
    res.json({ movie });
});
startService(app, Number(process.env.PORT) || 4002);
