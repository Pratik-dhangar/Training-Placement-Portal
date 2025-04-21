import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { eq, and } from "drizzle-orm";
import session from "express-session";
import pgSession from 'connect-pg-simple';
import { 
  User, InsertUser, 
  Job, InsertJob,
  Application, InsertApplication,
  AcademicDetails, InsertAcademicDetails,
  PersonalDetails, InsertPersonalDetails,
  users, jobs, applications, academicDetails, personalDetails
} from "@shared/schema";
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: join(__dirname, '.env') });

const { Pool } = pg;

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Academic details operations
  getAcademicDetails(userId: number): Promise<AcademicDetails | undefined>;
  updateAcademicDetails(userId: number, details: Partial<InsertAcademicDetails>): Promise<AcademicDetails>;

  // Personal details operations
  getPersonalDetails(userId: number): Promise<PersonalDetails | undefined>;
  updatePersonalDetails(userId: number, details: Partial<InsertPersonalDetails>): Promise<PersonalDetails>;
  
  // Student details (combined academic and personal)
  getStudentFullDetails(userId: number): Promise<{ user: User; academic?: AcademicDetails; personal?: PersonalDetails } | undefined>;
  getAllStudentsDetails(): Promise<{ user: User; academic?: AcademicDetails; personal?: PersonalDetails }[]>;

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

  getAllStudents(): Promise<User[]>;
  getPersonalDetails(id: string): Promise<any>;
  getAcademicDetails(id: string): Promise<any>;
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
    
    // Use PostgreSQL session store
    const PgSession = pgSession(session);
    this.sessionStore = new PgSession({
      pool: this.pool,
      tableName: 'sessions',
      createTableIfMissing: true
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
      console.log('Attempting to create job:', insertJob);
      console.log('Required fields check:', {
        title: !!insertJob.title,
        company: !!insertJob.company,
        description: !!insertJob.description,
        requirements: !!insertJob.requirements,
        location: !!insertJob.location,
        type: !!insertJob.type
      });
      
      const result = await this.db.insert(jobs).values(insertJob).returning();
      console.log('Job created successfully:', result[0]);
      return result[0];
    } catch (error) {
      console.error('Error creating job in database:', error);
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
      console.log(`Fetching applications for user ID: ${userId}`);
      const result = await this.db
        .select()
        .from(applications)
        .where(eq(applications.userId, userId));
      
      console.log(`Found ${result.length} applications for user ID: ${userId}`);
      return result;
    } catch (error) {
      console.error(`Error fetching applications for user ID: ${userId}`, error);
      throw error;
    }
  }

  async getApplicationsByJob(jobId: number): Promise<(Application & { user: User })[]> {
    try {
      console.log(`Fetching applications for job ID: ${jobId}`);
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
      
      console.log(`Found ${result.length} applications for job ID: ${jobId}`);
      
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
      console.error(`Error fetching applications for job ID: ${jobId}`, error);
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

  // Academic details methods
  async getAcademicDetails(userId: number): Promise<AcademicDetails | undefined> {
    try {
      const result = await this.db
        .select()
        .from(academicDetails)
        .where(eq(academicDetails.userId, userId));
      return result[0];
    } catch (error) {
      console.error(`Error fetching academic details for user ID: ${userId}`, error);
      throw error;
    }
  }

  async updateAcademicDetails(userId: number, details: Partial<InsertAcademicDetails>): Promise<AcademicDetails> {
    try {
      // Check if the academic details entry exists
      const existing = await this.getAcademicDetails(userId);

      if (existing) {
        // Update existing record
        const updateData: Record<string, any> = {};
        for (const [key, value] of Object.entries(details)) {
          if (value !== undefined && key !== 'userId') {
            updateData[key] = value;
          }
        }
        updateData.updatedAt = new Date();

        const result = await this.db
          .update(academicDetails)
          .set(updateData)
          .where(eq(academicDetails.userId, userId))
          .returning();
        
        console.log(`Academic details updated for user ID: ${userId}`);
        return result[0];
      } else {
        // Create new record
        const insertData = {
          userId,
          ...details,
        };

        const result = await this.db
          .insert(academicDetails)
          .values(insertData)
          .returning();
        
        console.log(`Academic details created for user ID: ${userId}`);
        return result[0];
      }
    } catch (error) {
      console.error(`Error updating academic details for user ID: ${userId}`, error);
      throw error;
    }
  }

  // Personal details methods
  async getPersonalDetails(userId: number): Promise<PersonalDetails | undefined> {
    try {
      const result = await this.db
        .select()
        .from(personalDetails)
        .where(eq(personalDetails.userId, userId));
      return result[0];
    } catch (error) {
      console.error(`Error fetching personal details for user ID: ${userId}`, error);
      throw error;
    }
  }

  async updatePersonalDetails(userId: number, details: Partial<InsertPersonalDetails>): Promise<PersonalDetails> {
    try {
      // Check if the personal details entry exists
      const existing = await this.getPersonalDetails(userId);
      
      // Get user data for required fields if not provided
      if (!details.email || !details.phone) {
        const user = await this.getUser(userId);
        if (user) {
          details.email = details.email || user.email;
          details.phone = details.phone || user.phone;
        }
      }

      if (existing) {
        // Update existing record
        const updateData: Record<string, any> = {};
        for (const [key, value] of Object.entries(details)) {
          if (value !== undefined && key !== 'userId') {
            updateData[key] = value;
          }
        }
        updateData.updatedAt = new Date();

        const result = await this.db
          .update(personalDetails)
          .set(updateData)
          .where(eq(personalDetails.userId, userId))
          .returning();
        
        console.log(`Personal details updated for user ID: ${userId}`);
        return result[0];
      } else {
        // Create new record
        const insertData = {
          userId,
          ...details,
        };

        const result = await this.db
          .insert(personalDetails)
          .values(insertData)
          .returning();
        
        console.log(`Personal details created for user ID: ${userId}`);
        return result[0];
      }
    } catch (error) {
      console.error(`Error updating personal details for user ID: ${userId}`, error);
      throw error;
    }
  }

  // Combined student details methods
  async getStudentFullDetails(userId: number): Promise<{ user: User; academic?: AcademicDetails; personal?: PersonalDetails } | undefined> {
    try {
      const user = await this.getUser(userId);
      if (!user) return undefined;

      const academic = await this.getAcademicDetails(userId.toString());
      const personal = await this.getPersonalDetails(userId.toString());

      return {
        user,
        academic,
        personal
      };
    } catch (error) {
      console.error(`Error fetching full details for user ID: ${userId}`, error);
      throw error;
    }
  }

  async getAllStudentsDetails(): Promise<{ user: User; academic?: AcademicDetails; personal?: PersonalDetails }[]> {
    try {
      // Get all student users
      const studentUsers = await this.db
        .select()
        .from(users)
        .where(eq(users.role, "student"));

      // Get details for each student
      const result = await Promise.all(
        studentUsers.map(async (user) => {
          const academic = await this.getAcademicDetails(user.id.toString());
          const personal = await this.getPersonalDetails(user.id.toString());
          return {
            user,
            academic,
            personal
          };
        })
      );

      return result;
    } catch (error) {
      console.error("Error fetching all students details", error);
      throw error;
    }
  }

  async getAllStudents(): Promise<User[]> {
    try {
      const result = await this.db
        .select()
        .from(users)
        .where(eq(users.role, "student"));
      
      return result;
    } catch (error) {
      console.error('Error fetching all students:', error);
      throw error;
    }
  }

  async getPersonalDetails(id: string): Promise<any> {
    try {
      const userId = parseInt(id);
      const result = await this.db
        .select()
        .from(personalDetails)
        .where(eq(personalDetails.userId, userId));
      
      return result.length > 0 ? result[0] : null;
    } catch (error) {
      console.error(`Error fetching personal details for user ${id}:`, error);
      throw error;
    }
  }

  async getAcademicDetails(id: string): Promise<any> {
    try {
      const userId = parseInt(id);
      const result = await this.db
        .select()
        .from(academicDetails)
        .where(eq(academicDetails.userId, userId));
      
      return result.length > 0 ? result[0] : null;
    } catch (error) {
      console.error(`Error fetching academic details for user ${id}:`, error);
      throw error;
    }
  }

  async updatePersonalDetails(id: string, details: any): Promise<any> {
    try {
      const userId = parseInt(id);
      
      // Check if personal details already exist
      const existing = await this.getPersonalDetails(id);
      
      // Prepare data with proper field names for database (camelCase to snake_case)
      const dbData = {
        userId,
        phone: details.phone,
        email: details.email,
        address: details.address,
        linkedin: details.linkedin,
        github: details.github,
        socialMedia: details.socialMedia,
      };
      
      if (existing) {
        // Update existing record
        const result = await this.db
          .update(personalDetails)
          .set(dbData)
          .where(eq(personalDetails.userId, userId))
          .returning();
        
        return result[0];
      } else {
        // Create new record
        const result = await this.db
          .insert(personalDetails)
          .values(dbData)
          .returning();
        
        return result[0];
      }
    } catch (error) {
      console.error(`Error updating personal details for user ${id}:`, error);
      throw error;
    }
  }

  async updateAcademicDetails(id: string, details: any): Promise<any> {
    try {
      const userId = parseInt(id);
      
      // Check if academic details already exist
      const existing = await this.getAcademicDetails(id);
      
      // Prepare data with proper field names for database (camelCase to snake_case)
      const dbData = {
        userId,
        course: details.course,
        branch: details.branch,
        semester: details.semester,
        academicYear: details.academicYear,
        percentage: details.percentage,
        armietPin: details.armietPin,
        previousSemesterGrades: details.previousSemesterGrades,
        backlogs: details.backlogs,
      };
      
      if (existing) {
        // Update existing record
        const result = await this.db
          .update(academicDetails)
          .set(dbData)
          .where(eq(academicDetails.userId, userId))
          .returning();
        
        return result[0];
      } else {
        // Create new record
        const result = await this.db
          .insert(academicDetails)
          .values(dbData)
          .returning();
        
        return result[0];
      }
    } catch (error) {
      console.error(`Error updating academic details for user ${id}:`, error);
      throw error;
    }
  }
}

export const storage = new DbStorage(); 