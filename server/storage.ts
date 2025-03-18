import { 
  User, InsertUser, 
  Job, InsertJob,
  Application, InsertApplication 
} from "@shared/schema";
import createMemoryStore from "memorystore";
import session from "express-session";

const MemoryStore = createMemoryStore(session);

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Job operations
  createJob(job: InsertJob): Promise<Job>;
  getJobs(): Promise<Job[]>;
  getJob(id: number): Promise<Job | undefined>;
  deleteJob(id: number): Promise<void>;

  // Application operations
  createApplication(application: InsertApplication): Promise<Application>;
  getApplicationsByUser(userId: number): Promise<Application[]>;
  getApplicationsByJob(jobId: number): Promise<Application[]>;
  updateApplicationStatus(id: number, status: "pending" | "accepted" | "rejected"): Promise<Application>;

  sessionStore: session.Store;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private jobs: Map<number, Job>;
  private applications: Map<number, Application>;
  private currentUserId: number;
  private currentJobId: number;
  private currentApplicationId: number;
  readonly sessionStore: session.Store;

  constructor() {
    this.users = new Map();
    this.jobs = new Map();
    this.applications = new Map();
    this.currentUserId = 1;
    this.currentJobId = 1;
    this.currentApplicationId = 1;
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000,
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async createJob(insertJob: InsertJob): Promise<Job> {
    const id = this.currentJobId++;
    const job: Job = { ...insertJob, id, createdAt: new Date() };
    this.jobs.set(id, job);
    return job;
  }

  async getJobs(): Promise<Job[]> {
    return Array.from(this.jobs.values());
  }

  async getJob(id: number): Promise<Job | undefined> {
    return this.jobs.get(id);
  }

  async deleteJob(id: number): Promise<void> {
    this.jobs.delete(id);
    // Delete associated applications
    this.applications = new Map(
      Array.from(this.applications.entries()).filter(([, app]) => app.jobId !== id)
    );
  }

  async createApplication(insertApplication: InsertApplication): Promise<Application> {
    const id = this.currentApplicationId++;
    const application: Application = { 
      ...insertApplication, 
      id,
      appliedAt: new Date(),
      jobId: insertApplication.jobId || null,
      userId: insertApplication.userId || null
    };
    this.applications.set(id, application);
    return application;
  }

  async getApplicationsByUser(userId: number): Promise<Application[]> {
    return Array.from(this.applications.values()).filter(
      (app) => app.userId === userId
    );
  }

  async getApplicationsByJob(jobId: number): Promise<Application[]> {
    return Array.from(this.applications.values()).filter(
      (app) => app.jobId === jobId
    );
  }

  async updateApplicationStatus(id: number, status: "pending" | "accepted" | "rejected"): Promise<Application> {
    const application = this.applications.get(id);
    if (!application) {
      throw new Error("Application not found");
    }
    const updatedApplication: Application = { ...application, status };
    this.applications.set(id, updatedApplication);
    return updatedApplication;
  }
}

export const storage = new MemStorage();