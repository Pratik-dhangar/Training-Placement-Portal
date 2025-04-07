import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./dbStorage";
import multer from "multer";
import path from "path";
import fs from "fs";

// resume upload
const upload = multer({
  dest: "uploads/",
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

  // Jobs API
  app.post("/api/jobs", async (req, res, next) => {
    try {
      if (!req.user || req.user.role !== "admin") {
        return res.status(403).send("Unauthorized");
      }
      const job = await storage.createJob(req.body);
      res.status(201).json(job);
    } catch (err) {
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
  app.post("/api/applications", upload.single("resume"), async (req, res, next) => {
    try {
      if (!req.user || req.user.role !== "student") {
        return res.status(403).send("Unauthorized");
      }
      if (!req.file) {
        return res.status(400).send("Resume is required");
      }

      const application = await storage.createApplication({
        userId: req.user.id,
        jobId: parseInt(req.body.jobId),
        status: "pending",
        resumePath: req.file.path,
      });

      res.status(201).json(application);
    } catch (err) {
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
      const filePath = path.join("uploads", safeFilename);
      
      // Log the actual file path we're trying to access
      console.log("Looking for file at path:", filePath);
      console.log("File exists:", fs.existsSync(filePath));
      
      if (!fs.existsSync(filePath)) {
        // Check if the uploads directory exists
        const uploadsExists = fs.existsSync("uploads");
        console.log("Uploads directory exists:", uploadsExists);
        
        // If uploads exists, list files in the directory to help debug
        if (uploadsExists) {
          const files = fs.readdirSync("uploads");
          console.log("Files in uploads directory:", files);
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