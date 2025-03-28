import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { eq, and } from "drizzle-orm";
import session from "express-session";
import createMemoryStore from "memorystore";
import { 
  User, InsertUser, 
  Job, InsertJob,
  Application, InsertApplication,
  users, jobs, applications
} from "@shared/schema";

const MemoryStore = createMemoryStore(session);
const { Pool } = pg;

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
  getApplicationsByJob(jobId: number): Promise<(Application & { user: User })[]>;
  getApplicationWithDetails(id: number): Promise<(Application & { user: User; job: Job }) | undefined>;
  getAllApplications(): Promise<(Application & { user: User; job: Job })[]>;
  updateApplicationStatus(id: number, status: "pending" | "accepted" | "rejected"): Promise<Application>;

  sessionStore: session.Store;
}

export class DbStorage implements IStorage {
  private db;
  private pool;
  readonly sessionStore: session.Store;

  constructor() {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL is not set");
    }

    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false
    });

    // Test the connection
    this.pool.on('error', (err) => {
      
      process.exit(-1);
    });

    this.db = drizzle(this.pool);
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000,
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    try {
      const result = await this.db.select().from(users).where(eq(users.id, id));
      return result[0];
    } catch (error) {
      
      throw error;
    }
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    try {
      const result = await this.db.select().from(users).where(eq(users.username, username));
      return result[0];
    } catch (error) {
      
      throw error;
    }
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    try {
      const result = await this.db.insert(users).values(insertUser).returning();
      return result[0];
    } catch (error) {
      
      throw error;
    }
  }

  async createJob(insertJob: InsertJob): Promise<Job> {
    try {
      const result = await this.db.insert(jobs).values(insertJob).returning();
      return result[0];
    } catch (error) {
      
      throw error;
    }
  }

  async getJobs(): Promise<Job[]> {
    try {
      return await this.db.select().from(jobs);
    } catch (error) {
     
      throw error;
    }
  }

  async getJob(id: number): Promise<Job | undefined> {
    try {
      const result = await this.db.select().from(jobs).where(eq(jobs.id, id));
      return result[0];
    } catch (error) {
      
      throw error;
    }
  }

  async deleteJob(id: number): Promise<void> {
    try {
      // First delete associated applications
      await this.db.delete(applications).where(eq(applications.jobId, id));
      // Then delete the job
      await this.db.delete(jobs).where(eq(jobs.id, id));
    } catch (error) {
      
      throw error;
    }
  }

  async createApplication(insertApplication: InsertApplication): Promise<Application> {
    try {
      const result = await this.db.insert(applications).values(insertApplication).returning();
      return result[0];
    } catch (error) {
      
      throw error;
    }
  }

  async getApplicationsByUser(userId: number): Promise<Application[]> {
    try {
      return await this.db.select().from(applications).where(eq(applications.userId, userId));
    } catch (error) {
     
      throw error;
    }
  }

  async getApplicationsByJob(jobId: number): Promise<(Application & { user: User })[]> {
    try {
      // Safer query approach with explicit field selection
      const result = await this.db
        .select({
          id: applications.id,
          userId: applications.userId,
          jobId: applications.jobId,
          status: applications.status,
          resumePath: applications.resumePath,
          appliedAt: applications.appliedAt,
          user: users
        })
        .from(applications)
        .leftJoin(users, eq(applications.userId, users.id))
        .where(eq(applications.jobId, jobId));
      
      // Filter out null users and cast to required type
      return result
        .filter(app => app.user !== null)
        .map(app => ({
          id: app.id,
          userId: app.userId,
          jobId: app.jobId,
          status: app.status,
          resumePath: app.resumePath,
          appliedAt: app.appliedAt,
          user: app.user as User
        }));
    } catch (error) {
      throw error;
    }
  }

  async getApplicationWithDetails(id: number): Promise<(Application & { user: User; job: Job }) | undefined> {
    try {
      const result = await this.db
        .select({
          id: applications.id,
          userId: applications.userId,
          jobId: applications.jobId,
          status: applications.status,
          resumePath: applications.resumePath,
          appliedAt: applications.appliedAt,
          user: users,
          job: jobs
        })
        .from(applications)
        .leftJoin(users, eq(applications.userId, users.id))
        .leftJoin(jobs, eq(applications.jobId, jobs.id))
        .where(eq(applications.id, id));
      
      if (result.length === 0) return undefined;
      
      return {
        id: result[0].id,
        userId: result[0].userId,
        jobId: result[0].jobId,
        status: result[0].status,
        resumePath: result[0].resumePath,
        appliedAt: result[0].appliedAt,
        user: result[0].user as User,
        job: result[0].job as Job
      };
    } catch (error) {
      throw error;
    }
  }

  async getAllApplications(): Promise<(Application & { user: User; job: Job })[]> {
    try {
      const result = await this.db
        .select({
          id: applications.id,
          userId: applications.userId,
          jobId: applications.jobId,
          status: applications.status,
          resumePath: applications.resumePath,
          appliedAt: applications.appliedAt,
          user: users,
          job: jobs
        })
        .from(applications)
        .leftJoin(users, eq(applications.userId, users.id))
        .leftJoin(jobs, eq(applications.jobId, jobs.id));
        
      // Filter out null users/jobs and cast to required type
      return result
        .filter(app => app.user !== null && app.job !== null)
        .map(app => ({
          id: app.id,
          userId: app.userId,
          jobId: app.jobId,
          status: app.status,
          resumePath: app.resumePath,
          appliedAt: app.appliedAt,
          user: app.user as User,
          job: app.job as Job
        }));
    } catch (error) {
      throw error;
    }
  }

  async updateApplicationStatus(id: number, status: "pending" | "accepted" | "rejected"): Promise<Application> {
    try {
      const result = await this.db
        .update(applications)
        .set({ status })
        .where(eq(applications.id, id))
        .returning();
      return result[0];
    } catch (error) {
      
      throw error;
    }
  }
}

export const storage = new DbStorage(); 