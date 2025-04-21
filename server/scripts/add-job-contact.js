import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env') });

// Create a new pool
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false
});

async function addContactDetailsColumn() {
  try {
    // Begin transaction
    await pool.query('BEGIN');

    console.log('Adding contact_details column to jobs table...');
    
    // Check if contact_details column exists
    const contactDetailsExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'jobs' 
        AND column_name = 'contact_details'
      );
    `);

    if (!contactDetailsExists.rows[0].exists) {
      await pool.query(`
        ALTER TABLE jobs 
        ADD COLUMN contact_details TEXT;
      `);
      console.log('Added contact_details column to jobs table');
    } else {
      console.log('contact_details column already exists in jobs table');
    }

    // Commit transaction
    await pool.query('COMMIT');

    console.log('Jobs table update completed successfully');
  } catch (error) {
    // Roll back transaction in case of error
    await pool.query('ROLLBACK');
    console.error('Error updating jobs table:', error);
  } finally {
    // Close the pool
    await pool.end();
  }
}

addContactDetailsColumn(); 