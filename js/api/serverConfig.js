// Server configuration
const SERVER_IP = process.env.SERVER_IP || 'localhost';
const SERVER_PORT = process.env.SERVER_PORT || '3000';
const API_BASE_URL = `http://${SERVER_IP}:${SERVER_PORT}/api`;
const POSTGRES_NAME = process.env.POSTGRES_NAME || 'admin';
const POSTGRES_USER = process.env.POSTGRES_USER || 'admin';
const POSTGRES_PASSWORD = process.env.POSTGRES_PASSWORD || 'admin';

// Database configuration
const DB_CONFIG = {
    host: SERVER_IP,
    port: 5432,
    user: POSTGRES_USER,
    database: POSTGRES_NAME,
    password: POSTGRES_PASSWORD
};

export {
    SERVER_IP,
    SERVER_PORT,
    API_BASE_URL,
    POSTGRES_NAME,
    POSTGRES_USER,
    POSTGRES_PASSWORD,
    DB_CONFIG
}; 