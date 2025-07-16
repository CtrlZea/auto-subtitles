@echo off
cd /d %~dp0

echo Checking if dependencies are installed...
pip show RealtimeSTT >nul 2>&1
if %errorlevel% neq 0 (
    echo Installing dependencies...
    pip install -r requirements.txt
    if %errorlevel% neq 0 (
        echo Failed to install dependencies. Please install them manually.
        pause
        exit /b 1
    )
)

echo Starting server...
start cmd /k python server.py
timeout /t 2
start index.html