# Training & Placement Portal

A full-stack Training and Placement Portal to manage student, company, and placement activities.

## Table of Contents

- [About](#about)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- .[UI Preview](#ui-preview)
- [Getting Started](#getting-started)
- [Scripts](#scripts)
- [Configuration](#configuration)
- [Contributing](#contributing)
- [License](#license)

---

## About

**T&P Portal** is a web application designed to streamline the training and placement process for educational institutions. It provides interfaces for students, companies, and administrators to manage placement activities efficiently.

## Features

- Student registration and profile management
- Company registration and job postings
- Application tracking and status updates
- Admin dashboard for managing users and placements
- File uploads (e.g., resumes, offer letters)
- Responsive UI with Tailwind CSS

## Tech Stack

- **Frontend:** React (Vite), Tailwind CSS
- **Backend:** Node.js, Express (in `server/`)
- **Database:** (Specify your DB, e.g., PostgreSQL, MySQL, SQLite)
- **ORM:** Drizzle
- **Other:** TypeScript, PostCSS

## Project Structure

```
tp portal/
├── client/         # Frontend React application
├── server/         # Backend Express server
├── shared/         # Shared code (types, utilities)
├── uploads/        # Uploaded files (resumes, etc.)
├── node_modules/   # Dependencies
├── package.json    # Project metadata and scripts
├── tailwind.config.ts
├── drizzle.config.ts
├── postcss.config.js
├── tsconfig.json
├── vite.config.ts
└── theme.json
```
## 📸 UI Preview

### 🔍 Student Login
![View Job](./client/public/admin.png)

## Getting Started

### Prerequisites

- Node.js (v16+ recommended)
- npm or yarn

### Installation

1. **Clone the repository:**
   ```bash
   git clone <repo-url>
   cd "tp portal"
   ```

2. **Install dependencies:**
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Set up environment variables:**
   - Copy `.env.example` to `.env` in both `client/` and `server/` (if applicable).
   - Fill in the required values.

4. **Run database migrations (if using Drizzle):**
   ```bash
   # Example command, adjust as needed
   npx drizzle-kit push
   ```

### Running the App

- **Start the backend:**
  ```bash
  cd server
  npm run dev
  ```

- **Start the frontend:**
  ```bash
  cd client
  npm run dev
  ```

- The app should now be running at [http://localhost:3000](http://localhost:3000) (or your configured port).

## Scripts

Common scripts (see `package.json` for more):

- `npm run dev` – Start development server
- `npm run build` – Build for production
- `npm run lint` – Lint codebase

## Configuration

- **Tailwind:** See `tailwind.config.ts`
- **Vite:** See `vite.config.ts`
- **Drizzle ORM:** See `drizzle.config.ts`
- **TypeScript:** See `tsconfig.json`

## Contributing

Contributions are welcome! Please open issues or submit pull requests for improvements and bug fixes.

---

