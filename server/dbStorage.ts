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
      console.error('Unexpected error on idle client', err);
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
      console.error('Error in getUser:', error);
      throw error;
    }
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    try {
      const result = await this.db.select().from(users).where(eq(users.username, username));
      return result[0];
    } catch (error) {
      console.error('Error in getUserByUsername:', error);
      throw error;
    }
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    try {
      const result = await this.db.insert(users).values(insertUser).returning();
      return result[0];
    } catch (error) {
      console.error('Error in createUser:', error);
      throw error;
    }
  }

  async createJob(insertJob: InsertJob): Promise<Job> {
    try {
      const result = await this.db.insert(jobs).values(insertJob).returning();
      return result[0];
    } catch (error) {
      console.error('Error in createJob:', error);
      throw error;
    }
  }

  async getJobs(): Promise<Job[]> {
    try {
      return await this.db.select().from(jobs);
    } catch (error) {
      console.error('Error in getJobs:', error);
      throw error;
    }
  }

  async getJob(id: number): Promise<Job | undefined> {
    try {
      const result = await this.db.select().from(jobs).where(eq(jobs.id, id));
      return result[0];
    } catch (error) {
      console.error('Error in getJob:', error);
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
      console.error('Error in deleteJob:', error);
      throw error;
    }
  }

  async createApplication(insertApplication: InsertApplication): Promise<Application> {
    try {
      const result = await this.db.insert(applications).values(insertApplication).returning();
      return result[0];
    } catch (error) {
      console.error('Error in createApplication:', error);
      throw error;
    }
  }

  async getApplicationsByUser(userId: number): Promise<Application[]> {
    try {
      return await this.db.select().from(applications).where(eq(applications.userId, userId));
    } catch (error) {
      console.error('Error in getApplicationsByUser:', error);
      throw error;
    }
  }

  async getApplicationsByJob(jobId: number): Promise<(Application & { user: User })[]> {
    try {
      const result = await this.db
        .select({
          ...applications,
          user: users
        })
        .from(applications)
        .leftJoin(users, eq(applications.userId, users.id))
        .where(eq(applications.jobId, jobId));
      
      return result.map(app => ({
        ...app,
        user: app.user
      }));
    } catch (error) {
      console.error('Error in getApplicationsByJob:', error);
      throw error;
    }
  }

  async getApplicationWithDetails(id: number): Promise<(Application & { user: User; job: Job }) | undefined> {
    try {
      const result = await this.db
        .select({
          ...applications,
          user: users,
          job: jobs
        })
        .from(applications)
        .leftJoin(users, eq(applications.userId, users.id))
        .leftJoin(jobs, eq(applications.jobId, jobs.id))
        .where(eq(applications.id, id));
      
      if (result.length === 0) return undefined;
      
      return {
        ...result[0],
        user: result[0].user,
        job: result[0].job
      };
    } catch (error) {
      console.error('Error in getApplicationWithDetails:', error);
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
      console.error('Error in updateApplicationStatus:', error);
      throw error;
    }
  }
}

export const storage = new DbStorage(); 