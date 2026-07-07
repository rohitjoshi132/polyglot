# Polyglot — Local Setup & Dependency Requirements

> **Last Updated:** July 2026  
> **Project Type:** Full-stack TypeScript pnpm Monorepo  
> **Architecture:** Express 5 API + React/Vite Frontend + PostgreSQL (Drizzle ORM) + Firebase Auth

---

## Table of Contents

1. [System Prerequisites](#1-system-prerequisites)
2. [Language Toolchains (for Code Compilation)](#2-language-toolchains-for-code-compilation)
3. [Environment Variables](#3-environment-variables)
4. [Database Setup (PostgreSQL)](#4-database-setup-postgresql)
5. [Firebase Setup (Authentication)](#5-firebase-setup-authentication)
6. [Installation & Running Locally](#6-installation--running-locally)
7. [Project Structure Overview](#7-project-structure-overview)
8. [Available Commands](#8-available-commands)
9. [Deployment Configuration](#9-deployment-configuration)
10. [Troubleshooting](#10-troubleshooting)

---

## 1. System Prerequisites

| Requirement       | Minimum Version | Recommended Version | Notes                                  |
|-------------------|-----------------|---------------------|----------------------------------------|
| **Node.js**       | v20.x           | v24.x (LTS)        | Required for ESM and Express 5 support |
| **pnpm**          | v9.x            | v10.x              | Project enforces pnpm via `preinstall` |
| **npm**           | v10.x           | v11.x              | Only needed to install pnpm globally   |
| **Git**           | v2.x            | Latest              | Version control                        |
| **Operating System** | Windows 10 / macOS 12 / Ubuntu 20.04 | Latest | Cross-platform compatible          |

### Install Node.js
Download from [https://nodejs.org](https://nodejs.org) or use a version manager:
```powershell
# Windows (using winget)
winget install OpenJS.NodeJS.LTS

# macOS (using Homebrew)
brew install node@24

# Linux (using nvm)
nvm install 24
nvm use 24
```

### Install pnpm
```bash
npm install -g pnpm
```

> ⚠️ **Important:** This project **enforces pnpm** as the package manager. Running `npm install` or `yarn install` will fail due to the `preinstall` script check.

---

## 2. Language Toolchains (for Code Compilation)

Polyglot detects and compiles/runs code in **12 programming languages**. To compile code locally, the respective toolchains must be installed on your system. These are **optional** — the app will still run, but compilation for missing languages will fail gracefully.

| Language     | Required Binary | Install Command (Windows)                     | Install Command (macOS/Linux)          |
|-------------|-----------------|------------------------------------------------|----------------------------------------|
| **Python**   | `python3` / `python` | `winget install Python.Python.3`        | `brew install python3` / `apt install python3` |
| **JavaScript** | `node`       | *(Installed with Node.js above)*               | *(Installed with Node.js above)*       |
| **TypeScript** | `npx tsx`    | *(Bundled with project dependencies)*          | *(Bundled with project dependencies)*  |
| **Go**       | `go`           | `winget install GoLang.Go`                     | `brew install go` / `apt install golang` |
| **Rust**     | `rustc`        | [https://rustup.rs](https://rustup.rs)         | `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs \| sh` |
| **C**        | `gcc`          | Install via [MSYS2](https://www.msys2.org/) or MinGW | `apt install gcc` / `brew install gcc` |
| **C++**      | `g++`          | Install via [MSYS2](https://www.msys2.org/) or MinGW | `apt install g++` / `brew install gcc` |
| **Java**     | `javac` + `java` | `winget install Microsoft.OpenJDK.21`       | `brew install openjdk` / `apt install default-jdk` |
| **Kotlin**   | `kotlinc`      | [https://kotlinlang.org/docs/command-line.html](https://kotlinlang.org/docs/command-line.html) | `brew install kotlin` / `snap install kotlin` |
| **Ruby**     | `ruby`         | [https://rubyinstaller.org](https://rubyinstaller.org) | `brew install ruby` / `apt install ruby` |
| **Swift**    | `swift` / `swiftc` | Not officially supported on Windows       | `brew install swift` / [swift.org](https://swift.org/download/) |
| **Haskell**  | `ghc` / `runghc` | [https://www.haskell.org/ghcup/](https://www.haskell.org/ghcup/) | `brew install ghc` / `apt install ghc` |

> 💡 **Tip:** The `/api/toolchains` endpoint (and the Toolchains page in the UI) will show which compilers are detected on your system and provide install hints for missing ones.

---

## 3. Environment Variables

### 3.1 Backend (API Server) — `artifacts/api-server/.env`

Create a `.env` file at `artifacts/api-server/.env` with the following variables:

```env
# ─── Server Configuration ───
PORT=3001                          # Port for the API server (default: 3001)
NODE_ENV=development               # Environment: development | production

# ─── Database ───
DATABASE_URL=postgresql://user:password@host:5432/polyglot_db
# PostgreSQL connection string (see Section 4 for setup)

# ─── Logging (Optional) ───
LOG_LEVEL=info                     # Pino log level: trace | debug | info | warn | error | fatal
```

### 3.2 Frontend (Polyglot App) — `artifacts/polyglot/.env`

Create a `.env` file at `artifacts/polyglot/.env` with the following variables:

```env
# ─── API Connection ───
VITE_API_URL=http://localhost:3001
# URL of the backend API server
# If omitted, defaults to https://polyglot-api-okgo.onrender.com (production)

# ─── Firebase Authentication ───
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-firebase-project-id
VITE_FIREBASE_APP_ID=your_firebase_app_id
```

### 3.3 Environment Variables Summary

| Variable                    | Package       | Required | Description                              |
|-----------------------------|---------------|----------|------------------------------------------|
| `PORT`                      | api-server    | No       | API server port (default: 3001)          |
| `NODE_ENV`                  | api-server    | No       | Environment mode                         |
| `DATABASE_URL`              | api-server    | **Yes**  | PostgreSQL connection string             |
| `LOG_LEVEL`                 | api-server    | No       | Pino logging level                       |
| `VITE_API_URL`              | polyglot      | No       | Backend API URL (has production fallback)|
| `VITE_FIREBASE_API_KEY`     | polyglot      | **Yes*** | Firebase Web API key                     |
| `VITE_FIREBASE_AUTH_DOMAIN` | polyglot      | **Yes*** | Firebase auth domain                     |
| `VITE_FIREBASE_PROJECT_ID`  | polyglot      | **Yes*** | Firebase project ID                      |
| `VITE_FIREBASE_APP_ID`      | polyglot      | **Yes*** | Firebase app ID                          |

> \* Firebase variables are required for **authentication features** (sign-in, projects). The app will load without them, but auth-dependent features (save project, profile) will not work.

---

## 4. Database Setup (PostgreSQL)

The project uses **PostgreSQL** with **Drizzle ORM** for data persistence.

### Option A: Local PostgreSQL

1. **Install PostgreSQL:**
   ```powershell
   # Windows
   winget install PostgreSQL.PostgreSQL

   # macOS
   brew install postgresql@16 && brew services start postgresql@16

   # Linux
   sudo apt install postgresql postgresql-contrib
   sudo systemctl start postgresql
   ```

2. **Create a database:**
   ```sql
   CREATE DATABASE polyglot_db;
   CREATE USER polyglot_user WITH PASSWORD 'your_secure_password';
   GRANT ALL PRIVILEGES ON DATABASE polyglot_db TO polyglot_user;
   ```

3. **Set `DATABASE_URL`:**
   ```env
   DATABASE_URL=postgresql://polyglot_user:your_secure_password@localhost:5432/polyglot_db
   ```

### Option B: Cloud PostgreSQL (Neon — Recommended for Quick Start)

1. Sign up at [https://neon.tech](https://neon.tech) (free tier available)
2. Create a new project and database
3. Copy the connection string to your `.env` file

### Push the Database Schema

After setting `DATABASE_URL`, push the Drizzle schema to create tables:

```bash
pnpm --filter @workspace/db run push
```

This creates three tables:
- **`submissions`** — Stores compilation history (code, detected language, output, timing)
- **`users`** — Firebase-synced user accounts
- **`projects`** — User-saved code projects

---

## 5. Firebase Setup (Authentication)

The project uses **Firebase Authentication** for user sign-in (Google + Email/Password).

### Steps to Configure Firebase:

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project (or use an existing one)
3. Navigate to **Project Settings** → **General** → scroll to **Your apps** → **Add app** → **Web**
4. Register the app and copy the config values:
   - `apiKey` → `VITE_FIREBASE_API_KEY`
   - `authDomain` → `VITE_FIREBASE_AUTH_DOMAIN`
   - `projectId` → `VITE_FIREBASE_PROJECT_ID`
   - `appId` → `VITE_FIREBASE_APP_ID`
5. Enable **Authentication** providers:
   - Go to **Authentication** → **Sign-in method**
   - Enable **Google** provider
   - Enable **Email/Password** provider
6. Add `localhost` to **Authorized domains** (under Authentication → Settings)

> 💡 **Note:** The backend uses Firebase Identity Toolkit REST API for token verification — no service account / `GOOGLE_APPLICATION_CREDENTIALS` is needed on the server side.

---

## 6. Installation & Running Locally

### Step 1: Clone & Install Dependencies

```powershell
# Navigate to project directory
cd C:\Users\rohit\OneDrive\Desktop\MAM\Docu-Builder

# Install all workspace dependencies
pnpm install
```

### Step 2: Configure Environment Files

Create `.env` files as described in [Section 3](#3-environment-variables):
- `artifacts/api-server/.env`
- `artifacts/polyglot/.env`

### Step 3: Push Database Schema

```bash
pnpm --filter @workspace/db run push
```

### Step 4: Start the API Server (Backend)

```powershell
pnpm --filter @workspace/api-server run dev
```
The API server starts on `http://localhost:3001` (or the port specified in `PORT`).

### Step 5: Start the Frontend (in a new terminal)

```powershell
pnpm --filter @workspace/polyglot run dev
```
The frontend starts on `http://localhost:5173` (Vite default).

### Step 6: Open in Browser

Navigate to **http://localhost:5173** to use the application.

---

## 7. Project Structure Overview

```
Docu-Builder/                        # Workspace root
├── artifacts/
│   ├── api-server/                  # Express 5 API backend
│   │   ├── src/
│   │   │   ├── lib/
│   │   │   │   ├── detector.ts      # 12-language detection engine
│   │   │   │   ├── compiler.ts      # Code compilation & execution
│   │   │   │   └── toolchains.ts    # System toolchain discovery
│   │   │   ├── routes/              # API route handlers
│   │   │   └── index.ts             # Server entry point
│   │   └── package.json
│   ├── polyglot/                    # React + Vite frontend
│   │   ├── src/
│   │   │   ├── pages/               # Home, Toolchains, Profile, History
│   │   │   ├── components/          # Layout, Auth Modal, shadcn/ui (55+)
│   │   │   ├── contexts/            # Auth & Theme providers
│   │   │   └── lib/                 # Firebase config
│   │   └── package.json
│   └── mockup-sandbox/              # Dev-only component preview tool
├── lib/
│   ├── api-spec/                    # OpenAPI spec + Orval codegen config
│   ├── api-client-react/            # Generated React Query hooks
│   ├── api-zod/                     # Generated Zod validation schemas
│   └── db/                          # Drizzle ORM schema (PostgreSQL)
├── scripts/                         # Build/utility scripts
├── package.json                     # Root workspace config
├── pnpm-workspace.yaml              # Workspace package definitions
├── tsconfig.base.json               # Shared TypeScript config
├── Dockerfile                       # Docker container (Node 24 + compilers)
└── netlify.toml                     # Netlify deployment config
```

---

## 8. Available Commands

### Root Workspace Commands

| Command                                              | Description                                    |
|------------------------------------------------------|------------------------------------------------|
| `pnpm install`                                       | Install all workspace dependencies             |
| `pnpm run build`                                     | Typecheck + build all packages                 |
| `pnpm run typecheck`                                 | Full TypeScript typecheck across workspace     |

### Per-Package Commands

| Command                                                      | Description                                    |
|--------------------------------------------------------------|------------------------------------------------|
| `pnpm --filter @workspace/api-server run dev`                | Start API server in dev mode                   |
| `pnpm --filter @workspace/api-server run build`              | Build API server (esbuild)                     |
| `pnpm --filter @workspace/polyglot run dev`                  | Start frontend dev server (Vite)               |
| `pnpm --filter @workspace/polyglot run build`                | Build frontend for production                  |
| `pnpm --filter @workspace/api-spec run codegen`              | Regenerate API hooks + Zod schemas from OpenAPI|
| `pnpm --filter @workspace/db run push`                       | Push Drizzle schema to database                |
| `pnpm --filter @workspace/db run push-force`                 | Force push schema (drops & recreates)          |

---

## 9. Deployment Configuration

### Frontend — Netlify

- **Build command:** `corepack enable pnpm && pnpm install --frozen-lockfile && pnpm --filter @workspace/polyglot run build`
- **Publish directory:** `artifacts/polyglot/dist/public`
- **API Proxy:** `/api/*` routes → `https://polyglot-api-okgo.onrender.com/api/:splat`
- **SPA Fallback:** All unmatched routes → `/index.html`
- **Required env:** `NODE_VERSION=20`, `PNPM_VERSION=10`

### Backend — Docker / Render

- **Base image:** `node:24-bullseye-slim`
- **Bundled compilers:** Python3, GCC, G++, Go, JDK, Rust (installed in Dockerfile)
- **Port:** 8080 (production)
- **Deployed at:** `https://polyglot-api-okgo.onrender.com`

---

## 10. Troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| `npm install` fails with "only-allow pnpm" | Use `pnpm install` instead — the project enforces pnpm |
| `DATABASE_URL must be set` error | Create `.env` file in `artifacts/api-server/` with a valid PostgreSQL URL |
| Firebase auth not working | Ensure all 4 `VITE_FIREBASE_*` env vars are set in `artifacts/polyglot/.env` |
| Compilation fails for a language | Check `/toolchains` page — the language toolchain may not be installed |
| `pnpm install` hangs or fails | Try `pnpm install --no-frozen-lockfile` or delete `node_modules` and retry |
| Frontend can't reach API | Set `VITE_API_URL=http://localhost:3001` in `artifacts/polyglot/.env` |
| TypeScript errors during build | Run `pnpm run typecheck` from root to see all type errors |
| Port 3001/5173 already in use | Change `PORT` in API `.env` or use `--port` flag for Vite |

### Verifying Your Setup

1. **Check Node.js version:** `node --version` (should be ≥ v20)
2. **Check pnpm version:** `pnpm --version` (should be ≥ v9)
3. **Check available toolchains:** Start the API server, then visit `http://localhost:3001/api/toolchains`
4. **Health check:** `curl http://localhost:3001/api/healthz` should return `{"status":"ok"}`

---

## Key Dependencies Summary

### Backend (`@workspace/api-server`)
- **Express 5** — HTTP framework
- **Drizzle ORM** — Database queries
- **Firebase Admin** — Auth token verification
- **Pino** — Structured logging
- **Zod** — Request/response validation
- **esbuild** — Production bundling

### Frontend (`@workspace/polyglot`)
- **React 19** — UI framework
- **Vite 7** — Build tool & dev server
- **Tailwind CSS 4** — Utility-first styling
- **shadcn/ui** (Radix UI) — 55+ UI components
- **TanStack React Query** — Server state management
- **Firebase** — Client-side authentication
- **Wouter** — Lightweight routing
- **Framer Motion** — Animations
- **Recharts** — Data visualization
- **Lucide React** — Icon library

### Shared Libraries
- **TypeScript 5.9** — Type safety across all packages
- **Zod 3** — Schema validation (shared API contracts)
- **Drizzle Kit** — Database migration tooling
- **Orval** — OpenAPI → React Query hook code generation
