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

async function addStudentPhotoColumn() {
  try {
    // Begin transaction
    await pool.query('BEGIN');

    console.log('Adding image_path column to personal_details table...');
    
    // Check if image_path column exists
    const imagePathExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'personal_details' 
        AND column_name = 'image_path'
      );
    `);

    if (!imagePathExists.rows[0].exists) {
      await pool.query(`
        ALTER TABLE personal_details 
        ADD COLUMN image_path TEXT;
      `);
      console.log('Added image_path column to personal_details table');
    } else {
      console.log('image_path column already exists in personal_details table');
    }

    // Commit transaction
    await pool.query('COMMIT');

    console.log('Personal details table update completed successfully');
  } catch (error) {
    // Roll back transaction in case of error
    await pool.query('ROLLBACK');
    console.error('Error updating personal_details table:', error);
  } finally {
    // Close the pool
    await pool.end();
  }
}

addStudentPhotoColumn(); 