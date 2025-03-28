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
        return res.status(403).send("Unauthorized");
      }
      
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
        return res.status(401).send("Unauthorized");
      }
      const applications = await storage.getApplicationsByUser(req.user.id);
      res.json(applications);
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
      const filePath = path.join("uploads", req.params.filename);
      
      if (!fs.existsSync(filePath)) {
        return res.status(404).send("Resume not found");
      }
      
      // Set appropriate headers for preview based on file type
      const ext = path.extname(filePath).toLowerCase();
      if (ext === '.pdf') {
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'inline; filename="resume.pdf"');
      } else {
        // For other file types, use download (since browser can't preview Word docs easily)
        return res.download(filePath);
      }
      
      // Stream the file
      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);
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