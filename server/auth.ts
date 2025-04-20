import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./dbStorage";
import { User as SelectUser } from "@shared/schema";
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: join(__dirname, '.env') });

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export function setupAuth(app: Express) {
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "development_secret",
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      sameSite: 'lax',
      path: '/',
      domain: process.env.NODE_ENV === "production" ? process.env.DOMAIN : undefined
    },
    name: 'tp_portal_session' // Unique session name
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  // Add middleware to log requests and session/auth info for debugging
  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    
    // Log session info
    console.log('Session ID:', req.sessionID);
    console.log('Session data:', req.session);
    
    // Log authentication status
    console.log('isAuthenticated:', req.isAuthenticated());
    if (req.user) {
      console.log('User:', { id: req.user.id, username: req.user.username, role: req.user.role });
    } else {
      console.log('User: Not authenticated');
    }
    
    next();
  });

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        console.log('LocalStrategy: Looking up user:', username);
        const user = await storage.getUserByUsername(username);
        console.log('LocalStrategy: User found:', user ? { id: user.id, username: user.username } : null);
        
        if (!user) {
          console.log('LocalStrategy: User not found');
          return done(null, false);
        }
        
        const passwordMatch = await comparePasswords(password, user.password);
        console.log('LocalStrategy: Password match:', passwordMatch);
        
        if (!passwordMatch) {
          console.log('LocalStrategy: Password mismatch');
          return done(null, false);
        }
        
        console.log('LocalStrategy: Authentication successful');
        return done(null, user);
      } catch (err) {
        console.error('LocalStrategy error:', err);
        return done(err);
      }
    }),
  );

  passport.serializeUser((user, done) => {
    console.log('Serializing user:', { id: user.id, username: user.username });
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      console.log('Deserializing user:', id);
      const user = await storage.getUser(id);
      console.log('Deserialized user:', user ? { id: user.id, username: user.username } : null);
      done(null, user);
    } catch (err) {
      console.error('Deserialization error:', err);
      done(err);
    }
  });

  app.post("/api/register", async (req, res, next) => {
    try {
      const { username, password, role, fullName, email, phone } = req.body;

      // Validate required fields
      if (!username || !password || !role || !fullName || !email || !phone) {
        return res.status(400).json({ 
          message: "All fields are required: username, password, role, fullName, email, phone" 
        });
      }

      // Validate role
      if (!["student", "admin"].includes(role)) {
        return res.status(400).json({ 
          message: "Role must be either 'student' or 'admin'" 
        });
      }

      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }

      const hashedPassword = await hashPassword(password);
      const user = await storage.createUser({
        username,
        password: hashedPassword,
        role,
        fullName,
        email,
        phone
      });

      req.login(user, (err) => {
        if (err) return next(err);
        // Don't send password in response
        const { password: _, ...userWithoutPassword } = user;
        res.status(201).json(userWithoutPassword);
      });
    } catch (err) {
      console.error('Registration error:', err);
      if (err instanceof Error) {
        res.status(500).json({ message: err.message });
      } else {
        res.status(500).json({ message: "An unexpected error occurred" });
      }
    }
  });

  app.post("/api/login", (req, res, next) => {
    console.log('Login attempt:', { username: req.body.username });
    passport.authenticate("local", (err, user, info) => {
      console.log('Authentication result:', { err, user: user ? { id: user.id, username: user.username } : null, info });
      if (err) {
        console.error('Login error:', err);
        return next(err);
      }
      if (!user) {
        console.log('Login failed: Invalid credentials');
        return res.status(401).json({ message: 'Invalid username or password' });
      }
      req.logIn(user, (err) => {
        if (err) {
          console.error('Session creation error:', err);
          return next(err);
        }
        console.log('Login successful:', { userId: user.id, username: user.username });
        // Don't send password in response
        const { password: _, ...userWithoutPassword } = user;
        res.status(200).json(userWithoutPassword);
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    res.json(req.user);
  });
}
