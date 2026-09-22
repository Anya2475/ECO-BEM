const { Pool } = require('pg');
require('dotenv').config();

// Create a new PostgreSQL connection pool
// This will use the DATABASE_URL environment variable
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false // Required for most managed DBs like Neon/Supabase
  }
});

// Initialize tables
async function initDb() {
  if (!process.env.DATABASE_URL) {
    console.log('⚠️ DATABASE_URL is not set. Skipping DB initialization.');
    return;
  }

  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          email VARCHAR(255) UNIQUE NOT NULL,
          password VARCHAR(255) NOT NULL,
          xp INTEGER DEFAULT 0,
          rank VARCHAR(100) DEFAULT 'مبتدئ',
          streak INTEGER DEFAULT 0,
          avatar_url TEXT DEFAULT '',
          dream_goal TEXT DEFAULT '',
          plan_type VARCHAR(50) DEFAULT 'free',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Add coins column if it doesn't exist
    await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS coins INTEGER DEFAULT 0');
    
    console.log('✅ PostgreSQL Database connected and initialized successfully.');
  } catch (error) {
    console.error('❌ Database connection error:', error);
  }
}

initDb();

module.exports = pool;
