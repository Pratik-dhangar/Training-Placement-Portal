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

async function createTables() {
  try {
    // Begin transaction
    await pool.query('BEGIN');

    // Check if personal_details table exists
    const personalDetailsExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'personal_details'
      );
    `);

    if (!personalDetailsExists.rows[0].exists) {
      console.log('Creating personal_details table...');
      await pool.query(`
        CREATE TABLE personal_details (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL UNIQUE REFERENCES users(id),
          phone TEXT NOT NULL,
          email TEXT NOT NULL,
          address TEXT,
          linkedin TEXT,
          updated_at TIMESTAMP DEFAULT NOW()
        );
      `);
      console.log('personal_details table created successfully');
    } else {
      console.log('personal_details table already exists');
    }

    // Check if academic_details table exists
    const academicDetailsExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'academic_details'
      );
    `);

    if (!academicDetailsExists.rows[0].exists) {
      console.log('Creating academic_details table...');
      await pool.query(`
        CREATE TABLE academic_details (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL UNIQUE REFERENCES users(id),
          course TEXT,
          branch TEXT,
          semester TEXT,
          academic_year TEXT,
          percentage TEXT,
          armiet_pin TEXT,
          updated_at TIMESTAMP DEFAULT NOW()
        );
      `);
      console.log('academic_details table created successfully');
    } else {
      console.log('academic_details table already exists');
    }

    // Commit transaction
    await pool.query('COMMIT');

    console.log('Tables creation completed successfully');
  } catch (error) {
    // Roll back transaction in case of error
    await pool.query('ROLLBACK');
    console.error('Error creating tables:', error);
  } finally {
    // Close the pool
    await pool.end();
  }
}

createTables(); 