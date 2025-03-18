import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { insertJobSchema, insertStudentSchema } from "@shared/schema";
import { z } from "zod";

function ensureAuth(req: Express.Request, res: Express.Response, next: Function) {
  if (!req.isAuthenticated()) {
    return res.status(401).send("Unauthorized");
  }
  next();
}

function ensureAdmin(req: Express.Request, res: Express.Response, next: Function) {
  if (!req.isAuthenticated() || req.user.role !== "admin") {
    return res.status(403).send("Forbidden");
  }
  next();
}

export async function registerRoutes(app: Express): Promise<Server> {
  setupAuth(app);

  // Student routes
  app.get("/api/student/profile", ensureAuth, async (req, res) => {
    const student = await storage.getStudent(req.user!.id);
    res.json(student);
  });

  app.post("/api/student/profile", ensureAuth, async (req, res) => {
    try {
      const data = insertStudentSchema.parse(req.body);
      const student = await storage.createStudent(req.user!.id, data);
      res.json(student);
    } catch (e) {
      if (e instanceof z.ZodError) {
        res.status(400).json(e.errors);
      } else {
        throw e;
      }
    }
  });

  app.get("/api/jobs", ensureAuth, async (req, res) => {
    const jobs = await storage.getJobs();
    res.json(jobs);
  });

  app.post("/api/student/apply/:jobId", ensureAuth, async (req, res) => {
    const student = await storage.getStudent(req.user!.id);
    if (!student) {
      return res.status(400).send("Complete your profile first");
    }
    
    const application = await storage.createApplication(
      student.id,
      parseInt(req.params.jobId)
    );
    res.json(application);
  });

  app.get("/api/student/applications", ensureAuth, async (req, res) => {
    const student = await storage.getStudent(req.user!.id);
    if (!student) {
      return res.json([]);
    }
    const applications = await storage.getApplications(student.id);
    res.json(applications);
  });

  // Admin routes
  app.post("/api/admin/jobs", ensureAdmin, async (req, res) => {
    try {
      const data = insertJobSchema.parse(req.body);
      const job = await storage.createJob(data);
      res.json(job);
    } catch (e) {
      if (e instanceof z.ZodError) {
        res.status(400).json(e.errors);
      } else {
        throw e;
      }
    }
  });

  app.get("/api/admin/applications", ensureAdmin, async (req, res) => {
    const applications = await storage.getApplications();
    res.json(applications);
  });

  app.post(
    "/api/admin/applications/:id/:status",
    ensureAdmin,
    async (req, res) => {
      const status = req.params.status as "accepted" | "rejected";
      if (status !== "accepted" && status !== "rejected") {
        return res.status(400).send("Invalid status");
      }

      const application = await storage.updateApplicationStatus(
        parseInt(req.params.id),
        status
      );
      res.json(application);
    }
  );

  const httpServer = createServer(app);
  return httpServer;
}
