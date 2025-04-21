import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: text("role", { enum: ["student", "admin"] }).notNull(),
  fullName: text("full_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
});

export const academicDetails = pgTable("academic_details", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull().unique(),
  course: text("course"),
  branch: text("branch"),
  semester: text("semester"),
  academicYear: text("academic_year"),
  percentage: text("percentage"),
  armietPin: text("armiet_pin"),
  previousSemesterGrades: text("previous_semester_grades"),
  backlogs: text("backlogs"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const personalDetails = pgTable("personal_details", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull().unique(),
  phone: text("phone").notNull(),
  email: text("email").notNull(),
  address: text("address"),
  linkedin: text("linkedin"),
  github: text("github"),
  socialMedia: text("social_media"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const jobs = pgTable("jobs", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  company: text("company").notNull(),
  description: text("description").notNull(),
  requirements: text("requirements").notNull(),
  location: text("location").notNull(),
  type: text("type", { enum: ["fulltime", "internship"] }).notNull(),
  salary: text("salary"),
  contactDetails: text("contact_details"),
  imagePath: text("image_path"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const applications = pgTable("applications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  jobId: integer("job_id").references(() => jobs.id),
  status: text("status", { enum: ["pending", "accepted", "rejected"] }).notNull(),
  resumePath: text("resume_path").notNull(),
  appliedAt: timestamp("applied_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  role: true,
  fullName: true,
  email: true,
  phone: true,
});

export const insertAcademicDetailsSchema = createInsertSchema(academicDetails).pick({
  userId: true,
  course: true,
  branch: true,
  semester: true,
  academicYear: true,
  percentage: true,
  armietPin: true,
  previousSemesterGrades: true,
  backlogs: true,
});

export const insertPersonalDetailsSchema = createInsertSchema(personalDetails).pick({
  userId: true,
  phone: true,
  email: true,
  address: true,
  linkedin: true,
  github: true,
  socialMedia: true,
});

export const insertJobSchema = createInsertSchema(jobs).pick({
  title: true,
  company: true,
  description: true,
  requirements: true,
  location: true,
  type: true,
  salary: true,
  contactDetails: true,
  imagePath: true,
});

export const insertApplicationSchema = createInsertSchema(applications).pick({
  userId: true,
  jobId: true,
  status: true,
  resumePath: true,
});

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type AcademicDetails = typeof academicDetails.$inferSelect;
export type InsertAcademicDetails = z.infer<typeof insertAcademicDetailsSchema>;
export type PersonalDetails = typeof personalDetails.$inferSelect;
export type InsertPersonalDetails = z.infer<typeof insertPersonalDetailsSchema>;
export type Job = typeof jobs.$inferSelect;
export type InsertJob = z.infer<typeof insertJobSchema>;
export type Application = typeof applications.$inferSelect;
export type InsertApplication = z.infer<typeof insertApplicationSchema>;
