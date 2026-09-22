require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function main() {
  try {
    await pool.query('ALTER TABLE users ADD COLUMN daily_quests_state JSONB DEFAULT \'{}\';');
    console.log('Successfully added daily_quests_state to users table');
  } catch (err) {
    if (err.code === '42701') {
        console.log('Column daily_quests_state already exists.');
    } else {
        console.error('Error adding column:', err);
    }
  } finally {
    pool.end();
  }
}
main();
