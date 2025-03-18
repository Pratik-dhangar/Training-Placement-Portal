import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import multer from "multer";
import path from "path";
import fs from "fs";

const upload = multer({
  dest: "uploads/",
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (_req, file, cb) => {
    const allowedTypes = [".pdf", ".doc", ".docx"];
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

  app.get("/api/applications/resume/:filename", async (req, res, next) => {
    try {
      if (!req.user || req.user.role !== "admin") {
        return res.status(403).send("Unauthorized");
      }
      const filePath = path.join("uploads", req.params.filename);
      if (!fs.existsSync(filePath)) {
        return res.status(404).send("Resume not found");
      }
      res.download(filePath);
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
        return res.status(403).send("Unauthorized");
      }
      const applications = await storage.getApplicationsByJob(parseInt(req.params.jobId));
      res.json(applications);
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