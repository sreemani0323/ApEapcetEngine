@echo off
echo ============================================================
echo Starting ApEapcetEngine Local Services
echo ============================================================

:: Kill any existing node/java processes on our target ports first to ensure a clean start
echo Cleaning up existing processes...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8080') do taskkill /f /pid %%a 2>nul
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8000') do taskkill /f /pid %%a 2>nul

:: Load environment variables from .env file if it exists
if exist .env (
    echo Loading environment from .env file...
    for /f "usebackq tokens=1,* delims==" %%A in (".env") do (
        set "%%A=%%B"
    )
) else (
    echo WARNING: No .env file found!
    echo Create a .env file in the project root with these variables:
    echo   DB_URL=jdbc:postgresql://localhost:5432/eapcet_db
    echo   DB_USERNAME=postgres
    echo   DB_PASSWORD=your_password_here
    echo   DB_SSLMODE=prefer
    echo   ML_SERVICE_URL=http://localhost:8000
    echo.
    echo Using local Docker defaults for now...
    set DB_URL=jdbc:postgresql://localhost:5432/eapcet_db
    set DB_USERNAME=postgres
    set DB_PASSWORD=localdev
    set DB_SSLMODE=prefer
    set ML_SERVICE_URL=http://localhost:8000
)

:: 1. Start ML Service (FastAPI)
echo Starting Python ML service on port 8000...
start "ML Service (Port 8000)" cmd /k "cd apps\ml-service && python -m uvicorn app:app --port 8000"

:: 2. Start Backend (Spring Boot)
echo Starting Spring Boot backend on port 8080 (also serving frontend)...
start "Spring Boot Backend (Port 8080)" cmd /k "cd apps\backend && mvnw.cmd spring-boot:run"

echo ============================================================
echo All services launched! Check the popped up windows for logs.
echo Open http://localhost:8080 in your browser.
echo ============================================================
