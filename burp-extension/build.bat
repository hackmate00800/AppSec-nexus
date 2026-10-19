@echo off
setlocal
echo ====================================================
echo Building AppSec Nexus Burp Extension (Montoya API)
echo ====================================================

set BURP_JAR=C:\Users\ankit\AppData\Local\Programs\BurpSuite\burpsuite.jar
if not exist "%BURP_JAR%" (
    echo [ERROR] Burp Suite jar not found at %BURP_JAR%
    exit /b 1
)

if exist bin rmdir /s /q bin
mkdir bin

echo Compiling Java source files...
javac -cp "%BURP_JAR%" -d bin -source 17 -target 17 src\main\java\com\appsec\nexus\burp\*.java
if %errorlevel% neq 0 (
    echo [ERROR] Compilation failed.
    exit /b %errorlevel%
)

echo Packaging into AppSec-Burp-Connector.jar...
if exist bin\burp rmdir /s /q bin\burp
jar -cf AppSec-Burp-Connector.jar -C bin com
if %errorlevel% neq 0 (
    echo [ERROR] Packaging failed.
    exit /b %errorlevel%
)

echo [SUCCESS] Extension built successfully:
echo %cd%\AppSec-Burp-Connector.jar
echo ====================================================
