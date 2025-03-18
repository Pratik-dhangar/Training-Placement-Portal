import { IStorage } from "./types";
import { User, Student, Job, Application, InsertUser, InsertStudent, InsertJob } from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";

const MemoryStore = createMemoryStore(session);

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private students: Map<number, Student>;
  private jobs: Map<number, Job>;
  private applications: Map<number, Application>;
  sessionStore: session.Store;
  currentId: number;

  constructor() {
    this.users = new Map();
    this.students = new Map();
    this.jobs = new Map();
    this.applications = new Map();
    this.currentId = 1;
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
    const id = this.currentId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async getStudent(userId: number): Promise<Student | undefined> {
    return Array.from(this.students.values()).find(
      (student) => student.userId === userId,
    );
  }

  async createStudent(userId: number, data: InsertStudent): Promise<Student> {
    const id = this.currentId++;
    const student: Student = { ...data, id, userId };
    this.students.set(id, student);
    return student;
  }

  async getJobs(): Promise<Job[]> {
    return Array.from(this.jobs.values());
  }

  async createJob(data: InsertJob): Promise<Job> {
    const id = this.currentId++;
    const job: Job = { ...data, id, createdAt: new Date() };
    this.jobs.set(id, job);
    return job;
  }

  async getApplications(studentId?: number): Promise<Application[]> {
    const apps = Array.from(this.applications.values());
    return studentId ? apps.filter(app => app.studentId === studentId) : apps;
  }

  async createApplication(studentId: number, jobId: number): Promise<Application> {
    const id = this.currentId++;
    const application: Application = {
      id,
      studentId,
      jobId,
      status: "pending",
      appliedAt: new Date()
    };
    this.applications.set(id, application);
    return application;
  }

  async updateApplicationStatus(
    id: number, 
    status: "accepted" | "rejected"
  ): Promise<Application> {
    const application = this.applications.get(id);
    if (!application) throw new Error("Application not found");
    
    const updated = { ...application, status };
    this.applications.set(id, updated);
    return updated;
  }
}

export const storage = new MemStorage();
