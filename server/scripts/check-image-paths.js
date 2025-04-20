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

async function checkImagePaths() {
  const client = await pool.connect();
  try {
    // Get all jobs with image paths
    const result = await client.query(`
      SELECT id, title, company, image_path 
      FROM jobs 
      ORDER BY id;
    `);
    
    console.log(`Found ${result.rows.length} jobs in database`);
    
    // Check each image path
    for (const job of result.rows) {
      console.log(`\nJob ID: ${job.id}, Title: ${job.title}, Company: ${job.company}`);
      console.log(`  Image Path: ${job.image_path || 'NULL'}`);
      
      if (job.image_path) {
        // Check if file exists
        const uploadsDir = join(process.cwd(), '..', 'uploads');
        const possiblePaths = [
          join(process.cwd(), job.image_path),
          join(uploadsDir, job.image_path.replace(/^uploads[\\\/]/, '')),
          join(uploadsDir, 'job-images', job.image_path.replace(/^uploads[\\\/]job-images[\\\/]/, '')),
          job.image_path,
        ];
        
        let fileExists = false;
        for (const path of possiblePaths) {
          if (fs.existsSync(path)) {
            console.log(`  ✅ File exists at: ${path}`);
            fileExists = true;
            break;
          }
        }
        
        if (!fileExists) {
          console.log(`  ❌ File not found in any expected location`);
        }
      }
    }
    
    // Check upload directory structure
    const uploadsDir = join(process.cwd(), '..', 'uploads');
    console.log(`\nChecking uploads directory: ${uploadsDir}`);
    
    if (fs.existsSync(uploadsDir)) {
      console.log('  ✅ Uploads directory exists');
      
      // List content of uploads directory
      const uploadFiles = fs.readdirSync(uploadsDir);
      console.log(`  Files/folders in uploads directory (${uploadFiles.length}):`, uploadFiles);
      
      // Check job-images subdirectory
      const jobImagesDir = join(uploadsDir, 'job-images');
      if (fs.existsSync(jobImagesDir)) {
        console.log('  ✅ job-images subdirectory exists');
        const jobImageFiles = fs.readdirSync(jobImagesDir);
        console.log(`  Files in job-images directory (${jobImageFiles.length}):`, jobImageFiles);
      } else {
        console.log('  ❌ job-images subdirectory does not exist');
      }
    } else {
      console.log('  ❌ Uploads directory does not exist');
    }
    
  } catch (err) {
    console.error('Error checking image paths:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

checkImagePaths(); 