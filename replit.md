# Polyglot — Auto-Detecting Compiler

## Overview

Polyglot is a universal compilation entry point. Users paste source code, and the system automatically identifies the programming language using multi-signal heuristics, then compiles/runs the code using the appropriate installed toolchain — with zero manual configuration.

Built as a full-stack TypeScript monorepo with an Express API backend and a React frontend.

## PRD Reference

Based on `Polyglot_PRD_v0.1-draft` — March 2026. Target stable release: Q3 2026.

## Supported Languages (12)

Python, JavaScript, TypeScript, Go, Rust, C, C++, Java, Kotlin, Ruby, Swift, Haskell

## Detection Pipeline

1. File extension lookup
2. Shebang / magic bytes
3. Keyword / token density
4. Syntax structure sampling (regex patterns per language)
5. AST parse attempt (planned for v2)

### Confidence Thresholds

| Score | Level | Action |
|-------|-------|--------|
| ≥ 0.92 | High | Auto-proceed silently |
| 0.70–0.91 | Medium | Proceed with informational notice |
| < 0.70 | Low | Prompt user to confirm |

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Frontend**: React + Vite + Tailwind CSS + shadcn/ui
- **Data fetching**: TanStack React Query (generated hooks)
- **Build**: esbuild (server), Vite (frontend)

## Structure

```text
artifacts-monorepo/
├── artifacts/
│   ├── api-server/         # Express API server
│   │   └── src/
│   │       ├── lib/
│   │       │   ├── detector.ts     # Language detection engine
│   │       │   ├── compiler.ts     # Compiler dispatch + execution
│   │       │   └── toolchains.ts   # Toolchain discovery (PATH scan)
│   │       └── routes/
│   │           ├── detect.ts       # POST /api/detect
│   │           ├── compile.ts      # POST /api/compile
│   │           ├── submissions.ts  # GET /api/submissions
│   │           └── toolchains.ts   # GET /api/toolchains
│   └── polyglot/           # React + Vite frontend
│       └── src/
│           ├── pages/
│           │   ├── home.tsx        # Code editor + detect/compile UI
│           │   ├── history.tsx     # Submission history table
│           │   └── toolchains.tsx  # Toolchain availability grid
│           └── components/
│               └── layout.tsx      # Sidebar navigation
├── lib/
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/
│       └── src/schema/
│           └── submissions.ts  # Drizzle schema for submission history
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── tsconfig.json
└── package.json
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/healthz | Health check |
| POST | /api/detect | Detect language from source code |
| POST | /api/compile | Detect + compile/run source code |
| GET | /api/submissions | List submission history (paginated) |
| GET | /api/submissions/:id | Get single submission |
| GET | /api/toolchains | List available toolchains |

## Database Schema

### `submissions` table

| Column | Type | Description |
|--------|------|-------------|
| id | serial PK | Submission ID |
| code | text | Source code submitted |
| filename | text nullable | Optional filename hint |
| detected_language | text | Language detected/used |
| confidence | real | Detection confidence (0–1) |
| confidence_level | text | high / medium / low |
| stdout | text | Compiler/runtime stdout |
| stderr | text | Compiler/runtime stderr |
| exit_code | integer | Process exit code |
| success | boolean | Whether compilation succeeded |
| compilation_ms | real | Time taken to compile + run |
| created_at | timestamp | When submitted |

## Key Commands

- `pnpm --filter @workspace/api-server run dev` — run the API dev server
- `pnpm --filter @workspace/polyglot run dev` — run the frontend
- `pnpm --filter @workspace/api-spec run codegen` — regenerate client hooks + Zod schemas from OpenAPI
- `pnpm --filter @workspace/db run push` — push schema to dev database
- `pnpm run typecheck` — full TypeScript typecheck

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. The root `tsconfig.json` lists all lib packages as project references.

- Always typecheck from the root — `pnpm run typecheck`
- `emitDeclarationOnly` — only `.d.ts` files emitted during typecheck; JS bundling handled by esbuild/Vite
- Artifact packages (`artifacts/*`) are leaf packages — not in root references

## Proxy & Service Routing

Global reverse proxy routes traffic by path:

- `/api/*` → api-server (port 8080)
- `/*` → polyglot frontend (port 22706)

## Milestones (from PRD)

| Milestone | Date | Status |
|-----------|------|--------|
| M1: Detection engine + 4 core languages | April 2026 | In progress |
| M2: Syntax fingerprinting + 8 more languages | May 2026 | Planned |
| M3: Stdin mode + output normalisation | June 2026 | Planned |
| M4: Beta + plugin API | July 2026 | Planned |
| M5: Stable v1.0 | Q3 2026 | Planned |

## Success Metrics (from PRD)

- Detection accuracy: ≥ 99% on benchmark corpus
- Detection latency: < 50ms p95 on files under 1MB
- Ambiguity rate: < 2% files requiring user confirmation
- False compiles: 0 wrong-language compilations (silent)
