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

async function addAcademicFields() {
  try {
    // Begin transaction
    await pool.query('BEGIN');

    console.log('Adding new academic fields to academic_details table...');
    
    // Check if previous_semester_grades column exists
    const previousSemesterGradesExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'academic_details' 
        AND column_name = 'previous_semester_grades'
      );
    `);

    if (!previousSemesterGradesExists.rows[0].exists) {
      await pool.query(`
        ALTER TABLE academic_details 
        ADD COLUMN previous_semester_grades TEXT;
      `);
      console.log('Added previous_semester_grades column to academic_details table');
    } else {
      console.log('previous_semester_grades column already exists in academic_details table');
    }

    // Check if backlogs column exists
    const backlogsExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'academic_details' 
        AND column_name = 'backlogs'
      );
    `);

    if (!backlogsExists.rows[0].exists) {
      await pool.query(`
        ALTER TABLE academic_details 
        ADD COLUMN backlogs TEXT;
      `);
      console.log('Added backlogs column to academic_details table');
    } else {
      console.log('backlogs column already exists in academic_details table');
    }

    // Commit transaction
    await pool.query('COMMIT');

    console.log('Academic fields update completed successfully');
  } catch (error) {
    // Roll back transaction in case of error
    await pool.query('ROLLBACK');
    console.error('Error updating academic fields:', error);
  } finally {
    // Close the pool
    await pool.end();
  }
}

addAcademicFields(); 