import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

try {
  // Get the directory where this script is located
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);

  // Path to the uploads directory
  const uploadsDir = path.join(__dirname, '..', 'uploads');

  // Function to recursively list files in a directory
  function listFiles(dir, indent = '') {
    if (!fs.existsSync(dir)) {
      console.log(`${indent}Directory does not exist: ${dir}`);
      return;
    }
    
    console.log(`${indent}Listing contents of: ${dir}`);
    const items = fs.readdirSync(dir);
    
    if (items.length === 0) {
      console.log(`${indent}  (empty directory)`);
      return;
    }
    
    for (const item of items) {
      const itemPath = path.join(dir, item);
      const stats = fs.statSync(itemPath);
      
      if (stats.isDirectory()) {
        console.log(`${indent}  [DIR] ${item}`);
        listFiles(itemPath, `${indent}    `);
      } else {
        console.log(`${indent}  [FILE] ${item} (${formatSize(stats.size)})`);
      }
    }
  }

  // Format file size in a human-readable way
  function formatSize(bytes) {
    if (bytes < 1024) return `${bytes} bytes`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  // Check if uploads directory exists, if not create it
  if (!fs.existsSync(uploadsDir)) {
    console.log(`Creating uploads directory: ${uploadsDir}`);
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  // Create subdirectories if they don't exist
  const subdirs = ['student-photos', 'job-images', 'resumes'];
  for (const subdir of subdirs) {
    const subdirPath = path.join(uploadsDir, subdir);
    if (!fs.existsSync(subdirPath)) {
      console.log(`Creating subdirectory: ${subdirPath}`);
      fs.mkdirSync(subdirPath, { recursive: true });
    }
  }

  console.log('=== Uploads Directory Structure ===');
  listFiles(uploadsDir);
  console.log('\n=== Path Information ===');
  console.log(`Script location: ${__dirname}`);
  console.log(`Uploads directory: ${uploadsDir}`);
  console.log(`Absolute path: ${path.resolve(uploadsDir)}`);
} catch (error) {
  console.error('Error in script:', error);
} 