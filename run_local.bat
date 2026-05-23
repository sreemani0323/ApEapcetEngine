@echo off
echo ============================================================
echo Starting ApEapcetEngine Local Services (Using Supabase Pooler)
echo ============================================================

:: Kill any existing node/java processes on our target ports first to ensure a clean start
echo Cleaning up existing processes...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8080') do taskkill /f /pid %%a 2>nul
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8000') do taskkill /f /pid %%a 2>nul

:: 1. Start ML Service (FastAPI)
echo Starting Python ML service on port 8000...
start "ML Service (Port 8000)" cmd /k "cd apps\ml-service && python -m uvicorn app:app --port 8000"

:: 2. Start Backend (Spring Boot connected to Supabase Pooler)
echo Starting Spring Boot backend on port 8080 (also serving frontend)...
set DB_URL=jdbc:postgresql://db.fauggaydzbehkziccnxc.supabase.co:5432/postgres
set DB_USERNAME=postgres
set DB_PASSWORD=printf("predictor");
set DB_SSLMODE=require
set ML_SERVICE_URL=http://localhost:8000
start "Spring Boot Backend (Port 8080)" cmd /k "cd apps\backend && mvnw.cmd spring-boot:run"

echo ============================================================
echo All services launched! Check the popped up windows for logs.
echo Open http://localhost:8080 in your browser.
echo ============================================================
