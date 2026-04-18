# Polyglot Project Validation & Execution Guide

## 1. Project Validation (Based on PRD v0.1-draft)

**PRD Overview:**
The PRD describes **Polyglot**, an auto-detecting compiler implemented as a single Go binary CLI tool. It aims to act as a universal entry point for compiling multiple languages seamlessly, using heuristics like file extensions, shebangs, syntax fingerprinting, and AST sampling.

**Codebase Analysis (`Docu-Builder` Workspace):**
- **Architecture Mismatch:** The current codebase is organized as a full-stack Web Application (using a `pnpm` workspace) rather than a Go CLI codebase.
- **Components Found:**
  - `artifacts/polyglot`: A React + Vite frontend web application (likely a web platform, marketing site, or online playground for Polyglot). It uses modern web tools like Tailwind CSS, Radix UI, and React Hook Form.
  - `lib/api-server`, `lib/api-client-react`, `lib/db`: Backend API services and database configurations (likely for the web application's data persistence).
- **Validation Conclusion:** The current repository does NOT contain the Go CLI core compiler described in the PRD. Instead, it seems to be the **Frontend/Web Platform** built around the Polyglot compiler concept (perhaps for online code execution or documentation). Therefore, while it relates to the wider "Polyglot" product ecosystem, it does not fulfill the core Go CLI specifications directly.

---

## 2. Local Execution Guide

Since the project is a modern web application leveraging a `pnpm` monorepo structure, follow these steps to deploy and run it locally on your Windows machine:

### Prerequisites:
- **Node.js**: Ensure Node.js (v18 or higher) is installed.
- **pnpm**: Ensure the `pnpm` package manager is installed (`npm install -g pnpm`).

### Step-by-Step Execution:

**Step 1: Open Terminal and Navigate to Project Directory**
Open PowerShell and navigate to the project directory:
```powershell
cd C:\Users\rohit\OneDrive\Desktop\MAM\Docu-Builder
```

**Step 2: Install Dependencies**
Install all workspace dependencies using `pnpm`. This will recursively install dependencies and link the workspaces:
```powershell
pnpm install
```

**Step 3: Start the API Server (Backend)**
If the frontend relies on the API server, start it first:
```powershell
cd artifacts\api-server
pnpm run dev
```
*(Note: You must configure environment variables like `PORT=8080` and `DATABASE_URL` in a `.env` file first).*

**Step 4: Start the Polyglot Web Application (Frontend)**
Open a **new** PowerShell tab/window, navigate specifically to the frontend workspace, and run the development server:
```powershell
cd C:\Users\rohit\OneDrive\Desktop\MAM\Docu-Builder\artifacts\polyglot
pnpm run dev
```

**Step 5: Access the Application**
Once Vite starts the development server, it will provide a localhost URL. Open your web browser and navigate to:
```text
http://localhost:5173
```
(Check the terminal output in case Vite assigns a different port).
