import pg from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
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

// Path to the uploads directory
const uploadsDir = path.join(__dirname, '..', 'uploads');
const studentPhotosDir = path.join(uploadsDir, 'student-photos');

async function ensureDirectoriesExist() {
  // Make sure uploads directory exists
  if (!fs.existsSync(uploadsDir)) {
    console.log(`Creating uploads directory: ${uploadsDir}`);
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  // Make sure student-photos directory exists
  if (!fs.existsSync(studentPhotosDir)) {
    console.log(`Creating student-photos directory: ${studentPhotosDir}`);
    fs.mkdirSync(studentPhotosDir, { recursive: true });
  }
}

async function checkStudentPhotos() {
  try {
    // Ensure directories exist
    await ensureDirectoriesExist();
    
    // Begin transaction
    await pool.query('BEGIN');

    console.log('Checking student photos in database...');
    
    // Get all personal_details records with image_path
    const result = await pool.query(`
      SELECT pd.user_id, pd.image_path, u.username, u.full_name
      FROM personal_details pd
      JOIN users u ON pd.user_id = u.id
      WHERE pd.image_path IS NOT NULL
    `);

    console.log(`Found ${result.rows.length} student records with image_path`);
    
    // Check each image path
    for (const row of result.rows) {
      console.log('-----------------------------------');
      console.log(`User: ${row.full_name} (ID: ${row.user_id})`);
      console.log(`Image path: ${row.image_path}`);
      
      // Check if the file exists
      if (row.image_path && fs.existsSync(row.image_path)) {
        console.log(`✓ Image file exists at path: ${row.image_path}`);
      } else if (row.image_path) {
        console.log(`✗ Image file does not exist at path: ${row.image_path}`);
        
        // Try to extract filename and check if it exists in the student-photos directory
        const filename = path.basename(row.image_path);
        const alternativePath = path.join(studentPhotosDir, filename);
        
        if (fs.existsSync(alternativePath)) {
          console.log(`✓ Found file in student-photos directory: ${alternativePath}`);
          
          // Update the database with the correct path
          await pool.query(`
            UPDATE personal_details
            SET image_path = $1
            WHERE user_id = $2
          `, [alternativePath, row.user_id]);
          
          console.log(`✓ Updated database record with correct path: ${alternativePath}`);
        } else {
          console.log(`✗ File not found in student-photos directory either`);
        }
      }
    }
    
    // List files in student-photos directory that might not be linked in the database
    console.log('\nChecking for orphaned files in student-photos directory...');
    if (fs.existsSync(studentPhotosDir)) {
      const files = fs.readdirSync(studentPhotosDir);
      if (files.length === 0) {
        console.log('No files found in student-photos directory');
      } else {
        console.log(`Found ${files.length} files in student-photos directory`);
        for (const file of files) {
          const filePath = path.join(studentPhotosDir, file);
          const inDb = result.rows.some(row => 
            row.image_path === filePath || 
            path.basename(row.image_path) === file
          );
          
          if (inDb) {
            console.log(`✓ File ${file} is linked in the database`);
          } else {
            console.log(`✗ File ${file} is not linked to any database record`);
          }
        }
      }
    }

    // Commit transaction
    await pool.query('COMMIT');

    console.log('\nStudent photos check completed successfully');
  } catch (error) {
    // Roll back transaction in case of error
    await pool.query('ROLLBACK');
    console.error('Error checking student photos:', error);
  } finally {
    // Close the pool
    await pool.end();
  }
}

checkStudentPhotos(); 