const mysql = require('mysql2/promise');
const jwt = require('jsonwebtoken');

const pool = mysql.createPool({
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'orbit',
    password: process.env.DB_PASSWORD || 'orbit_local',
    database: process.env.DB_NAME || 'orbit',
    waitForConnections: true,
    connectionLimit: 8,
    decimalNumbers: true
});

function signToken(user) {
    return jwt.sign({ id: user.id, name: user.name, email: user.email }, process.env.JWT_SECRET || 'local-only-secret', { expiresIn: '7d' });
}

function protect(req, res, next) {
    const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');
    if (!token) return res.status(401).json({ error: 'Sign in to continue.' });
    try {
        req.user = jwt.verify(token, process.env.JWT_SECRET || 'local-only-secret');
        next();
    } catch {
        return res.status(401).json({ error: 'Your session has expired. Sign in again.' });
    }
}

function startService(app, port = Number(process.env.PORT) || 4000, needsDatabase = false) {
    app.get('/health', (_req, res) => res.json({ status: 'ok' }));
    const listen = () => app.listen(port, '0.0.0.0', () => console.log(`Service listening on ${port}`));
    if (!needsDatabase) return listen();

    const connect = async () => {
        try {
            await pool.query('SELECT 1');
            listen();
        } catch (error) {
            console.error(`Database unavailable: ${error.message}; retrying in 2s`);
            setTimeout(connect, 2000);
        }
    };
    connect();
}

module.exports = { pool, protect, signToken, startService };
