# Contributing to ApEapcetEngine

First off, thank you for considering contributing! 🎉 Every contribution makes this platform more useful for students navigating AP EAPCET admissions.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [How Can I Contribute?](#how-can-i-contribute)
- [Development Setup](#development-setup)
- [Branch Naming Convention](#branch-naming-convention)
- [Commit Message Convention](#commit-message-convention)
- [Pull Request Process](#pull-request-process)
- [Style Guides](#style-guides)
- [Reporting Bugs](#reporting-bugs)
- [Suggesting Features](#suggesting-features)

## Code of Conduct

This project adheres to the [Contributor Covenant Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code. Please report unacceptable behavior by opening an issue.

## How Can I Contribute?

### 🐛 Fix Bugs
Look for issues labeled [`bug`](https://github.com/sreemani0323/ApEapcetEngine/labels/bug) or [`good first issue`](https://github.com/sreemani0323/ApEapcetEngine/labels/good%20first%20issue).

### ✨ Add Features
Check the [`enhancement`](https://github.com/sreemani0323/ApEapcetEngine/labels/enhancement) label for planned features.

### 📊 Add Data
When APSCHE releases new cutoff data (e.g., 2025), you can contribute by:
1. Adding the CSV to `data-pipeline/raw/`
2. Updating the ETL pipeline to include the new year
3. Retraining the model and submitting updated `.pkl` artifacts

### 📖 Improve Documentation
Typo fixes, better explanations, architecture diagrams — all welcome.

## Development Setup

### Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| Java | 21+ | Spring Boot backend |
| Node.js | 18+ | Express static frontend |
| Python | 3.12+ | ML service & data pipeline |
| PostgreSQL | 14+ | Database (or use Docker) |
| Docker | Latest | Optional, for local DB |

### Quick Start

```bash
# 1. Fork and clone
git clone https://github.com/<your-username>/ApEapcetEngine.git
cd ApEapcetEngine

# 2. Copy environment template
cp infra/.env.example .env
# Edit .env with your database credentials

# 3. Start PostgreSQL (Docker)
docker compose -f infra/docker-compose.yml up db -d

# 4. Load data into the database
cd data-pipeline/etl
pip install -r ../requirements.txt
python normalize.py
cd ../..

# 5. Start ML Service (Terminal 1)
cd apps/ml-service
pip install -r requirements.txt
uvicorn app:app --host 0.0.0.0 --port 8000 --reload

# 6. Start Backend (Terminal 2)
cd apps/backend
./mvnw spring-boot:run

# 7. Start Frontend (Terminal 3)
cd apps/frontend
npm install
npm run dev
```

### Verify Everything Works

- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:8080/swagger-ui.html
- **ML Service:** http://localhost:8000/health

## Branch Naming Convention

```
<type>/<short-description>

Examples:
  feat/add-2025-data
  fix/search-null-pointer
  docs/update-readme
  refactor/ml-service-cleanup
```

| Prefix | Usage |
|--------|-------|
| `feat/` | New feature |
| `fix/` | Bug fix |
| `docs/` | Documentation only |
| `refactor/` | Code restructuring |
| `perf/` | Performance improvement |
| `test/` | Adding or fixing tests |
| `ci/` | CI/CD pipeline changes |

## Commit Message Convention

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(scope): <description>

[optional body]

[optional footer(s)]
```

**Examples:**
```
feat(ml): add 2025 cutoff year to training pipeline
fix(backend): handle null branch_type in specification query
docs(readme): add Docker setup instructions
perf(etl): batch insert cutoffs for 10x speedup
```

**Types:** `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `ci`, `chore`

**Scopes:** `frontend`, `backend`, `ml`, `etl`, `infra`, `docs`

## Pull Request Process

1. **Fork** the repository and create your branch from `main`.
2. **Follow** the style guides below.
3. **Test** your changes locally — ensure the backend compiles (`./mvnw clean compile`) and the frontend starts (`npm run dev`).
4. **Update documentation** if you changed any public APIs or setup steps.
5. **Fill out** the PR template completely.
6. **Request review** from at least one maintainer.

### PR Checklist

- [ ] My code follows the project's style guides
- [ ] I have tested my changes locally
- [ ] I have updated documentation if needed
- [ ] My commits follow the conventional commit format
- [ ] I have not committed any secrets or credentials
- [ ] All existing tests still pass

## Style Guides

### Java (Backend)

- Follow standard Java conventions (camelCase for methods/variables, PascalCase for classes)
- Use `@Slf4j` for logging (no `System.out.println`)
- DTOs must use Lombok `@Data` / `@Builder` annotations
- All REST endpoints must return proper HTTP status codes
- Use `ProblemDetail` (RFC 7807) for error responses

### JavaScript (Frontend)

- Use vanilla JavaScript (ES6+) — no build step required
- Keep API calls centralized with `fetch()` and proper error handling
- Use `const`/`let` (never `var`)
- DOM elements should have unique, descriptive IDs
- Chart.js for all data visualizations

### Python (ML Service & ETL)

- Follow PEP 8
- Type hints for all function signatures
- Use `"""docstrings"""` for public functions
- Environment variables for all configuration — **never hardcode credentials**
- Use `sqlalchemy` for all database operations

## Reporting Bugs

Use the [Bug Report](https://github.com/sreemani0323/ApEapcetEngine/issues/new?template=bug_report.yml) issue template. Include:

1. **Steps to reproduce** — What did you do?
2. **Expected behavior** — What should have happened?
3. **Actual behavior** — What actually happened?
4. **Environment** — OS, Java version, Node version, Python version
5. **Screenshots** — If applicable

## Suggesting Features

Use the [Feature Request](https://github.com/sreemani0323/ApEapcetEngine/issues/new?template=feature_request.yml) issue template. Include:

1. **Problem statement** — What problem does this solve?
2. **Proposed solution** — How should it work?
3. **Alternatives considered** — What else did you think about?

---

Thank you for helping make AP EAPCET admissions more transparent! 🙏
