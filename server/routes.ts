import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./dbStorage";
import multer from "multer";
import path from "path";
import fs from "fs";
import express from "express";
import { join } from "path";

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

// student photo upload
const studentPhotoUpload = multer({
  dest: path.join(uploadsDir, "student-photos"),
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB limit for images
  },
  fileFilter: (_req, file, cb) => {
    const allowedTypes = [".jpg", ".jpeg", ".png"];
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

  // Serve uploaded files with improved logging
  app.use("/uploads", (req, res, next) => {
    console.log(`Static file request: ${req.path}`);
    
    // Log more details about the request
    console.log({
      originalUrl: req.originalUrl,
      path: req.path,
      baseUrl: req.baseUrl,
      fullPath: join(uploadsDir, req.path)
    });
    
    // Check if the file exists before trying to serve it
    const filePath = join(uploadsDir, req.path);
    if (!fs.existsSync(filePath)) {
      console.error(`File not found: ${filePath}`);
      return res.status(404).send("File not found");
    }
    
    express.static(uploadsDir)(req, res, (err) => {
      if (err) {
        console.error(`Error serving static file: ${req.path}`, err);
        return res.status(404).send("File not found");
      }
      next();
    });
  });

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
        contactDetails: req.body.contactDetails || null,
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
      console.log('Fetching all jobs');
      const jobs = await storage.getJobs();
      
      // Normalize image paths
      const normalizedJobs = jobs.map(job => {
        if (job.imagePath) {
          // Make sure paths are relative to uploads directory
          const path = job.imagePath.replace(/^.*[\\\/]uploads[\\\/]/, '');
          job.imagePath = path;
        }
        return job;
      });
      
      console.log(`Successfully retrieved ${jobs.length} jobs`);
      res.json(normalizedJobs);
    } catch (err) {
      console.error('Error fetching jobs:', err);
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

  // User details routes
  app.get("/api/users/:userId/details", async (req, res, next) => {
    try {
      // Check if the user is authenticated and authorized
      if (!req.user) {
        return res.status(401).send("Unauthorized");
      }
      
      const userId = parseInt(req.params.userId);
      
      // Admin can view any user's details, but students can only view their own
      if (req.user.role !== "admin" && req.user.id !== userId) {
        return res.status(403).send("Forbidden");
      }
      
      const details = await storage.getStudentFullDetails(userId);
      
      if (!details) {
        return res.status(404).send("User not found");
      }
      
      res.json(details);
    } catch (err) {
      console.error("Error fetching user details:", err);
      next(err);
    }
  });

  // Academic details routes
  app.get("/api/users/:userId/academic-details", async (req, res, next) => {
    try {
      // Check if the user is authenticated and authorized
      if (!req.user) {
        return res.status(401).send("Unauthorized");
      }
      
      const userId = parseInt(req.params.userId);
      
      // Admin can view any user's details, but students can only view their own
      if (req.user.role !== "admin" && req.user.id !== userId) {
        return res.status(403).send("Forbidden");
      }
      
      const details = await storage.getAcademicDetails(userId.toString());
      
      res.json(details || {});
    } catch (err) {
      console.error("Error fetching academic details:", err);
      next(err);
    }
  });

  app.patch("/api/users/:userId/academic-details", async (req, res, next) => {
    try {
      // Check if the user is authenticated and authorized
      if (!req.user) {
        return res.status(401).send("Unauthorized");
      }
      
      const userId = parseInt(req.params.userId);
      
      // Admin can update any user's details, but students can only update their own
      if (req.user.role !== "admin" && req.user.id !== userId) {
        return res.status(403).send("Forbidden");
      }
      
      // Extract details from request body
      const { 
        course, 
        branch, 
        semester, 
        academicYear, 
        percentage, 
        armietPin,
        previousSemesterGrades,
        backlogs
      } = req.body;
      
      // Update academic details
      const details = await storage.updateAcademicDetails(userId.toString(), {
        course, 
        branch, 
        semester, 
        academicYear, 
        percentage, 
        armietPin,
        previousSemesterGrades,
        backlogs
      });
      
      res.json(details);
    } catch (err) {
      console.error("Error updating academic details:", err);
      next(err);
    }
  });

  // Personal details routes
  app.get("/api/users/:userId/personal-details", async (req, res, next) => {
    try {
      // Check if the user is authenticated and authorized
      if (!req.user) {
        return res.status(401).send("Unauthorized");
      }
      
      const userId = parseInt(req.params.userId);
      
      // Admin can view any user's details, but students can only view their own
      if (req.user.role !== "admin" && req.user.id !== userId) {
        return res.status(403).send("Forbidden");
      }
      
      const details = await storage.getPersonalDetails(userId.toString());
      
      res.json(details || {});
    } catch (err) {
      console.error("Error fetching personal details:", err);
      next(err);
    }
  });

  app.patch("/api/users/:userId/personal-details", studentPhotoUpload.single("studentPhoto"), async (req, res, next) => {
    try {
      // Check if the user is authenticated and authorized
      if (!req.user) {
        return res.status(401).send("Unauthorized");
      }
      
      const userId = parseInt(req.params.userId);
      
      // Log debug info
      console.log("Updating personal details for user ID:", userId);
      console.log("Request body:", req.body);
      console.log("File uploaded:", req.file);
      
      // Admin can update any user's details, but students can only update their own
      if (req.user.role !== "admin" && req.user.id !== userId) {
        return res.status(403).send("Forbidden");
      }
      
      // Extract details from request body
      const { phone, email, address, linkedin, github, socialMedia } = req.body;
      
      // Prepare details object
      const details = {
        phone, 
        email, 
        address, 
        linkedin,
        github,
        socialMedia
      };

      // Add image path if a file was uploaded
      if (req.file) {
        console.log("Processing uploaded photo:", req.file.path);
        
        // Make sure path is normalized for storage
        const normalizedPath = req.file.path.replace(/\\/g, '/');
        console.log("Normalized path:", normalizedPath);
        
        details.imagePath = normalizedPath;
      }
      
      console.log("Updating personal details with:", details);
      
      // Update personal details
      const updatedDetails = await storage.updatePersonalDetails(userId.toString(), details);
      
      console.log("Updated personal details result:", updatedDetails);
      
      res.json(updatedDetails);
    } catch (err) {
      console.error("Error updating personal details:", err);
      next(err);
    }
  });

  // Admin route to get all students
  app.get('/api/admin/students', async (req, res) => {
    try {
      // Check if user is authenticated and is an admin
      const user = req.session.user;
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ error: 'Unauthorized' });
      }

      // Get all students
      const students = await storage.getAllStudents();
      console.log(`Found ${students.length} students`);

      // Get personal and academic details for each student
      const studentsWithDetails = await Promise.all(
        students.map(async (student) => {
          const personalDetails = await storage.getPersonalDetails(student.id);
          const academicDetails = await storage.getAcademicDetails(student.id);
          
          console.log(`Student ${student.id} personal details:`, personalDetails);
          
          // Transform snake_case to camelCase for academicDetails
          const formattedAcademicDetails = academicDetails ? {
            course: academicDetails.course,
            branch: academicDetails.branch,
            semester: academicDetails.semester,
            academicYear: academicDetails.academicYear,
            percentage: academicDetails.percentage,
            armietPin: academicDetails.armietPin,
            previousSemesterGrades: academicDetails.previousSemesterGrades,
            backlogs: academicDetails.backlogs,
            updatedAt: academicDetails.updatedAt || new Date().toISOString()
          } : null;
          
          // Format personal details
          const formattedPersonalDetails = personalDetails ? {
            address: personalDetails.address,
            linkedin: personalDetails.linkedin,
            github: personalDetails.github,
            socialMedia: personalDetails.socialMedia,
            imagePath: personalDetails.imagePath, // Include the image path
            updatedAt: personalDetails.updatedAt || new Date().toISOString()
          } : null;
          
          return {
            ...student,
            academicDetails: formattedAcademicDetails,
            personalDetails: formattedPersonalDetails
          };
        })
      );

      res.json({ students: studentsWithDetails });
    } catch (error) {
      console.error('Error fetching students:', error);
      res.status(500).json({ error: 'Failed to fetch students' });
    }
  });

  // Helper middleware to check authentication and admin role
  const requireAdmin = (req, res, next) => {
    console.log("Auth check - isAuthenticated:", req.isAuthenticated());
    console.log("Auth check - session:", req.session);
    console.log("Auth check - user:", req.user);
    
    if (!req.isAuthenticated()) {
      return res.status(401).json({ 
        error: 'Unauthorized', 
        message: 'Authentication required' 
      });
    }
    
    if (req.user.role !== 'admin') {
      return res.status(403).json({ 
        error: 'Forbidden', 
        message: 'Admin privileges required' 
      });
    }
    
    console.log("Auth check passed, proceeding to handler");
    next();
  };
  
  // Admin route to lookup a specific student
  app.get('/api/admin/student-lookup', requireAdmin, async (req, res) => {
    try {
      // Check if we have either username or userId
      const { username, userId } = req.query as { username?: string, userId?: string };
      console.log('Looking up student with:', { username, userId });
      
      if (!username && !userId) {
        console.log('Missing search parameters');
        return res.status(400).json({ 
          error: 'Bad Request', 
          message: 'Either username or userId is required' 
        });
      }
      
      // Fetch the user by either username or ID
      let studentUser;
      if (username) {
        console.log('Searching by username:', username);
        studentUser = await storage.getUserByUsername(username);
      } else if (userId) {
        console.log('Searching by userId:', userId);
        studentUser = await storage.getUser(parseInt(userId));
      }
      
      console.log('Student search result:', studentUser ? 'Found' : 'Not found');
      
      if (!studentUser) {
        return res.status(404).json({ 
          error: 'Not Found', 
          message: 'Student not found' 
        });
      }
      
      console.log('Fetching full details for student:', studentUser.username, 'ID:', studentUser.id);
      
      // Get full student details
      const studentDetails = await storage.getStudentFullDetails(studentUser.id);
      
      console.log('Student details retrieved successfully');
      res.json(studentDetails);
    } catch (error) {
      console.error('Error looking up student:', error);
      res.status(500).json({ 
        error: 'Server Error', 
        message: 'Failed to retrieve student details' 
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}