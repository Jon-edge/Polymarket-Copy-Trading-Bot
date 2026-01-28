# PowerShell script to check for Python installation
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Python Installation Checker" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$pythonFound = $false

# Check common Python commands
$pythonCommands = @("python", "python3", "py", "python.exe", "python3.exe")

Write-Host "Checking for Python in PATH..." -ForegroundColor Yellow
foreach ($cmd in $pythonCommands) {
    try {
        $result = Get-Command $cmd -ErrorAction Stop
        Write-Host "✓ Found: $($result.Name) at $($result.Source)" -ForegroundColor Green
        Write-Host "  Version: " -NoNewline
        & $cmd --version 2>&1
        $pythonFound = $true
    } catch {
        # Command not found, continue
    }
}

if (-not $pythonFound) {
    Write-Host ""
    Write-Host "❌ Python not found in PATH" -ForegroundColor Red
    Write-Host ""
    
    # Check common installation locations
    Write-Host "Checking common installation locations..." -ForegroundColor Yellow
    
    $commonPaths = @(
        "$env:LOCALAPPDATA\Programs\Python",
        "$env:ProgramFiles\Python*",
        "C:\Python*",
        "$env:ProgramFiles(x86)\Python*",
        "$env:USERPROFILE\AppData\Local\Programs\Python"
    )
    
    $foundPaths = @()
    foreach ($pathPattern in $commonPaths) {
        $paths = Get-ChildItem -Path $pathPattern -ErrorAction SilentlyContinue -Directory
        foreach ($path in $paths) {
            $pythonExe = Join-Path $path.FullName "python.exe"
            if (Test-Path $pythonExe) {
                $foundPaths += $pythonExe
                Write-Host "✓ Found Python at: $pythonExe" -ForegroundColor Green
                Write-Host "  Version: " -NoNewline
                & $pythonExe --version 2>&1
            }
        }
    }
    
    if ($foundPaths.Count -gt 0) {
        Write-Host ""
        Write-Host "⚠️  Python is installed but not in PATH" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "To fix this:" -ForegroundColor Cyan
        Write-Host "1. Add Python to PATH manually:" -ForegroundColor White
        Write-Host "   - Open System Properties > Environment Variables" -ForegroundColor Gray
        Write-Host "   - Add Python directory to PATH" -ForegroundColor Gray
        Write-Host ""
        Write-Host "2. Or use the full path to run Python:" -ForegroundColor White
        Write-Host "   $($foundPaths[0]) -m src.main" -ForegroundColor Gray
        Write-Host ""
        Write-Host "3. Or reinstall Python with 'Add to PATH' option:" -ForegroundColor White
        Write-Host "   https://www.python.org/downloads/" -ForegroundColor Gray
    } else {
        Write-Host ""
        Write-Host "❌ Python is not installed" -ForegroundColor Red
        Write-Host ""
        Write-Host "Please install Python 3.9+ from:" -ForegroundColor Yellow
        Write-Host "   https://www.python.org/downloads/" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "During installation, make sure to:" -ForegroundColor Yellow
        Write-Host "   ✓ Check 'Add Python to PATH'" -ForegroundColor Green
        Write-Host "   ✓ Check 'Install for all users' (optional)" -ForegroundColor Green
    }
} else {
    Write-Host ""
    Write-Host "✅ Python is installed and accessible!" -ForegroundColor Green
    Write-Host ""
    Write-Host "You can now run the bot with:" -ForegroundColor Cyan
    Write-Host "   python -m src.main" -ForegroundColor White
    Write-Host "   or" -ForegroundColor Gray
    Write-Host "   .\run.bat" -ForegroundColor White
}

Write-Host ""
