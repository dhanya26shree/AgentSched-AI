@echo off
setlocal enabledelayedexpansion

echo ===================================================
echo             AgentSched AI Build ^& Run
echo ===================================================

:: Check Java
java -version >nul 2>&1
if %errorlevel% neq 0 (
    echo Error: Java is not installed or not in PATH.
    pause
    exit /b 1
)

:: Create bin folder if not exists
if not exist bin mkdir bin

echo Compiling Java source files...
javac -encoding UTF-8 -cp "lib\mysql-connector-j-8.4.0.jar;lib\gson-2.11.0.jar" -d bin src\model\*.java src\db\*.java src\service\*.java src\controller\*.java src\Main.java

if %errorlevel% neq 0 (
    echo Compilation failed. Please resolve the errors above.
    pause
    exit /b 1
)

echo Compilation successful.
echo Starting AgentSched AI HTTP server...
echo.

java -cp "bin;lib\mysql-connector-j-8.4.0.jar;lib\gson-2.11.0.jar" Main

pause
