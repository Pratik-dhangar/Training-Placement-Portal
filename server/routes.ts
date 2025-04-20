import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./dbStorage";
import multer from "multer";
import path from "path";
import fs from "fs";
import express from "express";

// Configure uploads
const uploadsDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure separate upload destinations
const jobImageUpload = multer({
  dest: path.join(uploadsDir, "job-images"),
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB limit for images
  },
  fileFilter: (_req, file, cb) => {
    const allowedTypes = [".jpg", ".jpeg", ".png", ".gif"];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid image file type"));
    }
  },
});

// resume upload
const resumeUpload = multer({
  dest: path.join(uploadsDir, "resumes"),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (_req, file, cb) => {
    const allowedTypes = [".pdf", ".doc", ".docx", ".jpeg"];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type"));
    }
  },
});

export async function registerRoutes(app: Express): Promise<Server> {
  setupAuth(app);

  // Serve uploaded files
  app.use("/uploads", express.static(uploadsDir));

  // Jobs API
  app.post("/api/jobs", jobImageUpload.single("jobImage"), async (req, res, next) => {
    try {
      if (!req.user || req.user.role !== "admin") {
        return res.status(403).send("Unauthorized");
      }

      // Validate required fields
      const requiredFields = ['title', 'company', 'description', 'requirements', 'location', 'type'];
      const missingFields = requiredFields.filter(field => !req.body[field]);
      
      if (missingFields.length > 0) {
        return res.status(400).send(`Missing required fields: ${missingFields.join(', ')}`);
      }

      // Extract job data from request body
      const jobData = {
        title: req.body.title,
        company: req.body.company,
        description: req.body.description,
        requirements: req.body.requirements,
        location: req.body.location,
        type: req.body.type,
        salary: req.body.salary || null,
        imagePath: req.file ? req.file.path : null,
      };

      console.log('Creating job with data:', jobData);
      const job = await storage.createJob(jobData);
      res.status(201).json(job);
    } catch (err) {
      console.error('Error creating job:', err);
      next(err);
    }
  });

  app.get("/api/jobs", async (_req, res, next) => {
    try {
      const jobs = await storage.getJobs();
      res.json(jobs);
    } catch (err) {
      next(err);
    }
  });

  app.delete("/api/jobs/:id", async (req, res, next) => {
    try {
      if (!req.user || req.user.role !== "admin") {
        return res.status(403).send("Unauthorized");
      }
      await storage.deleteJob(parseInt(req.params.id));
      res.sendStatus(200);
    } catch (err) {
      next(err);
    }
  });

  // Applications API
  app.post("/api/applications", resumeUpload.single("resume"), async (req, res, next) => {
    try {
      if (!req.user || req.user.role !== "student") {
        return res.status(403).send("Unauthorized");
      }
      if (!req.file) {
        return res.status(400).send("Resume is required");
      }

      // Store the file path in a consistent way
      const resumePath = req.file.path;
      console.log("Resume uploaded to:", resumePath);

      const application = await storage.createApplication({
        userId: req.user.id,
        jobId: parseInt(req.body.jobId),
        status: "pending",
        resumePath: resumePath,
      });

      res.status(201).json(application);
    } catch (err) {
      console.error("Error creating application:", err);
      next(err);
    }
  });

  // Get all applications (for admin dashboard)
  app.get("/api/applications", async (req, res, next) => {
    try {
      if (!req.user || req.user.role !== "admin") {
        console.log('Unauthorized access attempt to /api/applications');
        return res.status(403).send("Unauthorized");
      }
      
      console.log('Admin fetching all applications');
      const applications = await storage.getAllApplications();
      
      // Group applications by job
      const jobMap = new Map();
      applications.forEach(app => {
        if (!jobMap.has(app.jobId)) {
          jobMap.set(app.jobId, {
            job: app.job,
            applications: []
          });
        }
        jobMap.get(app.jobId).applications.push({
          ...app,
          job: undefined // Remove duplicated job data from each application
        });
      });
      
      const applicationsByJob = Array.from(jobMap.values());
      res.json(applicationsByJob);
    } catch (err) {
      next(err);
    }
  });

  app.get("/api/applications/user", async (req, res, next) => {
    try {
      if (!req.user) {
        console.log('Unauthenticated access attempt to /api/applications/user');
        return res.status(401).send("Unauthorized");
      }
      
      console.log(`Fetching applications for user ID: ${req.user.id}, username: ${req.user.username}`);
      const applications = await storage.getApplicationsByUser(req.user.id);
      
      // Double-check that we only return the current user's applications
      const filteredApplications = applications.filter(app => app.userId === req.user?.id);
      console.log(`Found ${filteredApplications.length} applications for user ID: ${req.user.id}`);
      
      res.json(filteredApplications);
    } catch (err) {
      next(err);
    }
  });

  app.get("/api/applications/job/:jobId", async (req, res, next) => {
    try {
      if (!req.user || req.user.role !== "admin") {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      const jobIdParam = req.params.jobId;
      
      
      // Validate and parse jobId
      let jobId: number;
      try {
        jobId = parseInt(jobIdParam);
        if (isNaN(jobId)) {
          throw new Error("Invalid job ID");
        }
      } catch (error) {
        
        return res.status(400).json({ message: "Invalid job ID" });
      }
      
     
      const applications = await storage.getApplicationsByJob(jobId);
      
      
      res.json(applications);
    } catch (err) {
      
      next(err);
    }
  });

  app.get("/api/applications/resume/:filename", async (req, res, next) => {
    try {
      if (!req.user || req.user.role !== "admin") {
        return res.status(403).send("Unauthorized");
      }
      
      // Log the requested filename
      console.log("Requested resume filename:", req.params.filename);
      
      // Ensure we're just using the filename without any path traversal
      const safeFilename = path.basename(req.params.filename);
      
      // Try multiple possible locations for the resume file
      const possiblePaths = [
        path.join(uploadsDir, safeFilename),
        path.join(uploadsDir, "resumes", safeFilename),
        safeFilename,  // For older files that might have stored the full path
        path.join("uploads", safeFilename), // For older path format
      ];
      
      // Find the first path that exists
      let filePath = null;
      for (const pathToCheck of possiblePaths) {
        console.log("Checking path:", pathToCheck);
        if (fs.existsSync(pathToCheck)) {
          filePath = pathToCheck;
          console.log("Found file at:", filePath);
          break;
        }
      }
      
      // If no file found after checking all possible locations
      if (!filePath) {
        console.log("Resume file not found in any of the expected locations");
        console.log("Uploads directory exists:", fs.existsSync(uploadsDir));
        
        // If uploads directory exists, list files to help debug
        if (fs.existsSync(uploadsDir)) {
          console.log("Files in uploads directory:", fs.readdirSync(uploadsDir));
          
          // Also check resumes subdirectory if it exists
          const resumesDir = path.join(uploadsDir, "resumes");
          if (fs.existsSync(resumesDir)) {
            console.log("Files in resumes directory:", fs.readdirSync(resumesDir));
          }
        }
        
        return res.status(404).send("Resume not found");
      }

      // For files without extensions, determine the content type by reading the first few bytes
      const fileBuffer = fs.readFileSync(filePath, { flag: 'r' });
      
      // Check file signatures (magic numbers) to determine file type
      let contentType = 'application/octet-stream';
      let extension = '';
      
      // PDF: starts with %PDF (25 50 44 46)
      if (fileBuffer.length >= 4 && 
          fileBuffer[0] === 0x25 && 
          fileBuffer[1] === 0x50 && 
          fileBuffer[2] === 0x44 && 
          fileBuffer[3] === 0x46) {
        contentType = 'application/pdf';
        extension = '.pdf';
      }
      // JPEG: starts with FFD8
      else if (fileBuffer.length >= 2 && 
               fileBuffer[0] === 0xFF && 
               fileBuffer[1] === 0xD8) {
        contentType = 'image/jpeg';
        extension = '.jpg';
      }
      // DOC: starts with D0CF11E0
      else if (fileBuffer.length >= 8 && 
               fileBuffer[0] === 0xD0 && 
               fileBuffer[1] === 0xCF && 
               fileBuffer[2] === 0x11 && 
               fileBuffer[3] === 0xE0) {
        contentType = 'application/msword';
        extension = '.doc';
      }
      // DOCX: is a zip file starting with PK
      else if (fileBuffer.length >= 2 && 
               fileBuffer[0] === 0x50 && 
               fileBuffer[1] === 0x4B) {
        contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        extension = '.docx';
      }
      
      console.log("Detected content type:", contentType);
      
      // Set headers for inline viewing
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `inline; filename="resume${extension}"`);
      
      // Stream the file for viewing
      fs.createReadStream(filePath).pipe(res);
    } catch (err) {
      console.error("Error serving resume file:", err);
      next(err);
    }
  });

  // Get application details by id - place this after other specific application routes
  app.get("/api/applications/:id", async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).send("Unauthorized");
      }
      
      const applicationId = parseInt(req.params.id);
      const application = await storage.getApplicationWithDetails(applicationId);
      
      if (!application) {
        return res.status(404).send("Application not found");
      }
      
      // Check if user is authorized to view this application
      if (req.user.role !== "admin" && application.userId !== req.user.id) {
        return res.status(403).send("Unauthorized");
      }
      
      res.json(application);
    } catch (err) {
      next(err);
    }
  });

  app.patch("/api/applications/:id/status", async (req, res, next) => {
    try {
      if (!req.user || req.user.role !== "admin") {
        return res.status(403).send("Unauthorized");
      }
      const application = await storage.updateApplicationStatus(
        parseInt(req.params.id),
        req.body.status
      );
      res.json(application);
    } catch (err) {
      next(err);
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}