import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '../.env') });

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function fixImagePaths() {
  const client = await pool.connect();
  
  try {
    // Get all jobs with image paths
    const result = await client.query(`
      SELECT id, title, company, image_path 
      FROM jobs 
      WHERE image_path IS NOT NULL
      ORDER BY id;
    `);
    
    console.log(`Found ${result.rows.length} jobs with image paths in database`);
    
    // Create job-images directory if it doesn't exist
    const uploadsDir = join(process.cwd(), '..', 'uploads');
    const jobImagesDir = join(uploadsDir, 'job-images');
    
    if (!fs.existsSync(jobImagesDir)) {
      console.log('Creating job-images directory');
      fs.mkdirSync(jobImagesDir, { recursive: true });
    }
    
    // Check and update each image path
    for (const job of result.rows) {
      console.log(`\nJob ID: ${job.id}, Title: ${job.title}, Company: ${job.company}`);
      console.log(`  Original Image Path: ${job.image_path}`);
      
      // Skip if the path already has job-images in it
      if (job.image_path.includes('job-images')) {
        console.log('  ✅ Path already includes job-images folder, no need to update');
        continue;
      }
      
      // Get just the filename without any path
      const filename = job.image_path.split(/[\\\/]/).pop();
      
      // New path relative to uploads directory
      const newPath = `job-images/${filename}`;
      
      console.log(`  New Path: ${newPath}`);
      
      // Check if the file exists at the original location
      const oldFullPath = join(uploadsDir, filename);
      const newFullPath = join(uploadsDir, newPath);
      
      if (fs.existsSync(oldFullPath)) {
        // Move the file if it exists
        try {
          console.log(`  Moving file from ${oldFullPath} to ${newFullPath}`);
          // Copy instead of move to avoid permissions issues
          fs.copyFileSync(oldFullPath, newFullPath);
          console.log('  ✅ File copied successfully');
        } catch (err) {
          console.error(`  ❌ Error copying file: ${err.message}`);
        }
      } else {
        console.log(`  ⚠️ Original file not found at ${oldFullPath}`);
      }
      
      // Update the database regardless (as our front-end will handle both paths now)
      try {
        await client.query(`
          UPDATE jobs
          SET image_path = $1
          WHERE id = $2
        `, [newPath, job.id]);
        console.log('  ✅ Database updated with new path');
      } catch (err) {
        console.error(`  ❌ Error updating database: ${err.message}`);
      }
    }
    
    console.log('\nPath update complete');
    
  } catch (err) {
    console.error('Error fixing image paths:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

fixImagePaths(); 