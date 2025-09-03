@echo off
REM Batch script to build the Manually Sort Folders Thunderbird extension
REM This script creates a .xpi file that can be installed in Thunderbird

echo Building Manually Sort Folders extension...

REM Set the extension name and file
set EXTENSION_NAME=tbsortfolders
set EXTENSION_FILE=%EXTENSION_NAME%.xpi

REM Remove existing extension file if it exists
if exist %EXTENSION_FILE% (
    echo Removing existing %EXTENSION_FILE%...
    del %EXTENSION_FILE%
)

echo Creating %EXTENSION_FILE%...

REM Create a temporary directory for files to include
if exist temp_package (
    rmdir /s /q temp_package
)
mkdir temp_package

REM Copy all files and directories to the temporary directory
REM Excluding typical development files
xcopy . temp_package\ /E /I /H /EXCLUDE:exclude.txt

REM Check if files were copied
dir temp_package /s /b >nul 2>&1
if errorlevel 1 (
    echo Warning: No files found to package
)

REM Create the zip file (XPI is just a ZIP file)
powershell -Command "Add-Type -Assembly System.IO.Compression.FileSystem; [System.IO.Compression.ZipFile]::CreateFromDirectory('temp_package', '%EXTENSION_FILE%', [System.IO.Compression.CompressionLevel]::Optimal, $false)"

if exist %EXTENSION_FILE% (
    echo.
    echo Extension built successfully: %EXTENSION_FILE%
    echo.
    echo You can now install this extension in Thunderbird:
    echo 1. Open Thunderbird
    echo 2. Go to Add-ons (Ctrl+Shift+A)
    echo 3. Click the gear icon and select "Install Add-on From File"
    echo 4. Select the %EXTENSION_FILE% file
    echo.
) else (
    echo.
    echo Error: Failed to create the extension file.
    echo.
)

REM Clean up temporary directory
rmdir /s /q temp_package

pause