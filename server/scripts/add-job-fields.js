import pkg from 'pg';
const { Pool } = pkg;
import 'dotenv/config';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false
});

async function addColumns() {
  try {
    // Create a client from the pool
    const client = await pool.connect();
    
    try {
      // Start transaction
      await client.query('BEGIN');
      
      // Add salary column if it doesn't exist
      await client.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_name = 'jobs' AND column_name = 'salary'
          ) THEN
            ALTER TABLE jobs ADD COLUMN salary TEXT;
          END IF;
        END
        $$;
      `);
      
      // Add image_path column if it doesn't exist
      await client.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_name = 'jobs' AND column_name = 'image_path'
          ) THEN
            ALTER TABLE jobs ADD COLUMN image_path TEXT;
          END IF;
        END
        $$;
      `);

      // Commit the transaction
      await client.query('COMMIT');
      console.log('Successfully added salary and image_path columns to jobs table');
    } catch (e) {
      // Roll back the transaction in case of error
      await client.query('ROLLBACK');
      console.error('Error during transaction, rolling back.', e);
      throw e;
    } finally {
      // Release the client back to the pool
      client.release();
    }
  } catch (err) {
    console.error('Database connection error:', err);
  } finally {
    // Close the pool
    await pool.end();
  }
}

// Run the function
addColumns().catch(err => {
  console.error('Failed to add columns:', err);
  process.exit(1);
}); 