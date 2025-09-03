# PowerShell script to build the Manually Sort Folders Thunderbird extension
# This script creates a .xpi file that can be installed in Thunderbird

Write-Host "Building Manually Sort Folders extension..." -ForegroundColor Green

try {
    # Get the current date for versioning
    $Date = Get-Date -Format "yyyyMMddHHmm"
    $ExtensionName = "tbsortfolders"
    $ExtensionFile = "$ExtensionName.xpi"

    # Remove existing extension file if it exists
    if (Test-Path $ExtensionFile) {
        Write-Host "Removing existing $ExtensionFile..." -ForegroundColor Yellow
        Remove-Item $ExtensionFile -Force
    }

    # Define files and directories to exclude
    $ExcludePatterns = @(
        "*.xpi",
        "*.template",
        "Makefile",
        "TODO",
        "resources_past",
        "*/.*.sw*",
        "*/*~",
        "build-extension.ps1",
        "exclude.txt",
        ".git",
        ".gitignore"
    )

    Write-Host "Creating $ExtensionFile..." -ForegroundColor Yellow

    # Create a temporary directory for files to include
    $TempDir = "temp_package"
    if (Test-Path $TempDir) {
        Remove-Item $TempDir -Recurse -Force
    }
    New-Item -ItemType Directory -Name $TempDir | Out-Null

    # Copy all files and directories to the temporary directory
    Get-ChildItem -Path "." -Exclude $ExcludePatterns | ForEach-Object {
        if ($_.Name -ne $TempDir) {
            # Skip hidden files and directories
            if (!($_.Name.StartsWith("."))) {
                Write-Host "  Copying $($_.Name)..." -ForegroundColor Gray
                Copy-Item -Path $_.FullName -Destination $TempDir -Recurse -ErrorAction SilentlyContinue
            }
        }
    }

    # Create the zip file (XPI is just a ZIP file)
    Add-Type -Assembly System.IO.Compression.FileSystem
    $CompressionLevel = [System.IO.Compression.CompressionLevel]::Optimal
    [System.IO.Compression.ZipFile]::CreateFromDirectory($TempDir, $ExtensionFile, $CompressionLevel, $false)

    # Clean up temporary directory
    Remove-Item $TempDir -Recurse -Force

    # Check if the file was created successfully
    if (Test-Path $ExtensionFile) {
        $fileSize = (Get-Item $ExtensionFile).Length
        Write-Host "Extension built successfully: $ExtensionFile (Size: $fileSize bytes)" -ForegroundColor Green
        Write-Host "You can now install this extension in Thunderbird:" -ForegroundColor Cyan
        Write-Host "1. Open Thunderbird" -ForegroundColor Cyan
        Write-Host "2. Go to Add-ons (Ctrl+Shift+A)" -ForegroundColor Cyan
        Write-Host "3. Click the gear icon and select 'Install Add-on From File'" -ForegroundColor Cyan
        Write-Host "4. Select the $ExtensionFile file" -ForegroundColor Cyan
    } else {
        Write-Host "Error: Failed to create the extension file." -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "Error building extension: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}