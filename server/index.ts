import "dotenv/config";
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import fs from 'fs';
import path from 'path';

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

// Ensure uploads directories exist
const uploadsDir = path.join(process.cwd(), "uploads");
const studentPhotosDir = path.join(uploadsDir, "student-photos");
const jobImagesDir = path.join(uploadsDir, "job-images");
const resumesDir = path.join(uploadsDir, "resumes");

// Create directories if they don't exist
if (!fs.existsSync(uploadsDir)) {
  console.log(`Creating uploads directory: ${uploadsDir}`);
  fs.mkdirSync(uploadsDir, { recursive: true });
}

if (!fs.existsSync(studentPhotosDir)) {
  console.log(`Creating student-photos directory: ${studentPhotosDir}`);
  fs.mkdirSync(studentPhotosDir, { recursive: true });
}

if (!fs.existsSync(jobImagesDir)) {
  console.log(`Creating job-images directory: ${jobImagesDir}`);
  fs.mkdirSync(jobImagesDir, { recursive: true });
}

if (!fs.existsSync(resumesDir)) {
  console.log(`Creating resumes directory: ${resumesDir}`);
  fs.mkdirSync(resumesDir, { recursive: true });
}

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the configured port
  // this serves both the API and the client.
  const port = process.env.PORT || 3000;
  server.listen(port, () => {
    log(`serving on port ${port}`);
    console.log(`serving on port ${port}`);
  });
})();
