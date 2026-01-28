# PowerShell script to help install Python 3.9+
# This script will guide you through Python installation

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Python Installation Helper" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if Python is already installed
$pythonInstalled = $false
$pythonCommands = @("python", "python3", "py")

foreach ($cmd in $pythonCommands) {
    try {
        $result = Get-Command $cmd -ErrorAction Stop
        $version = & $cmd --version 2>&1
        Write-Host "✓ Python is already installed: $version" -ForegroundColor Green
        Write-Host "  Location: $($result.Source)" -ForegroundColor Gray
        
        # Check if version is 3.9+
        if ($version -match 'Python (\d+)\.(\d+)') {
            $major = [int]$matches[1]
            $minor = [int]$matches[2]
            if ($major -gt 3 -or ($major -eq 3 -and $minor -ge 9)) {
                Write-Host "✓ Version is 3.9+ (compatible)" -ForegroundColor Green
                $pythonInstalled = $true
                break
            } else {
                Write-Host "⚠ Version is below 3.9 (need to upgrade)" -ForegroundColor Yellow
            }
        }
    }
    catch {
        # Continue checking
    }
}

if ($pythonInstalled) {
    Write-Host ""
    Write-Host "Python is already installed and ready to use!" -ForegroundColor Green
    Write-Host ""
    exit 0
}

Write-Host "Python 3.9+ is not installed." -ForegroundColor Yellow
Write-Host ""

# Method 1: Microsoft Store (easiest on Windows)
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Installation Method 1: Microsoft Store" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "This is the easiest method on Windows 10/11:" -ForegroundColor White
Write-Host ""
Write-Host "1. Open Microsoft Store" -ForegroundColor Yellow
Write-Host "2. Search for 'Python 3.11' or 'Python 3.12'" -ForegroundColor Yellow
Write-Host "3. Click 'Install'" -ForegroundColor Yellow
Write-Host "4. Wait for installation to complete" -ForegroundColor Yellow
Write-Host "5. Restart your terminal" -ForegroundColor Yellow
Write-Host ""

$useStore = Read-Host "Would you like to open Microsoft Store now? (Y/N)"

if ($useStore -eq "Y" -or $useStore -eq "y") {
    Write-Host "Opening Microsoft Store..." -ForegroundColor Cyan
    Start-Process "ms-windows-store://pdp/?ProductId=9NRWMJP3717K"
    Write-Host ""
    Write-Host "After installation, restart your terminal and run:" -ForegroundColor Yellow
    Write-Host "  python --version" -ForegroundColor White
    Write-Host ""
    exit 0
}

# Method 2: Direct Download
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Installation Method 2: Direct Download" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Download Python from python.org:" -ForegroundColor White
Write-Host ""
Write-Host "Recommended versions:" -ForegroundColor Yellow
Write-Host "  • Python 3.12: https://www.python.org/downloads/release/python-3120/" -ForegroundColor Cyan
Write-Host "  • Python 3.11: https://www.python.org/downloads/release/python-3117/" -ForegroundColor Cyan
Write-Host "  • Python 3.10: https://www.python.org/downloads/release/python-31011/" -ForegroundColor Cyan
Write-Host "  • Python 3.9:  https://www.python.org/downloads/release/python-3913/" -ForegroundColor Cyan
Write-Host ""
Write-Host "Or visit: https://www.python.org/downloads/" -ForegroundColor Cyan
Write-Host ""

$openBrowser = Read-Host "Would you like to open Python download page in browser? (Y/N)"

if ($openBrowser -eq "Y" -or $openBrowser -eq "y") {
    Write-Host "Opening Python download page..." -ForegroundColor Cyan
    Start-Process "https://www.python.org/downloads/"
    Write-Host ""
    Write-Host "IMPORTANT: During installation, make sure to:" -ForegroundColor Yellow
    Write-Host "  ✓ Check 'Add Python to PATH'" -ForegroundColor Green
    Write-Host "  ✓ Choose 'Install Now' or customize installation" -ForegroundColor Green
    Write-Host ""
    Write-Host "After installation, restart your terminal and run:" -ForegroundColor Yellow
    Write-Host "  python --version" -ForegroundColor White
    Write-Host ""
}

# Method 3: Using winget (Windows Package Manager)
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Installation Method 3: Using winget" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if winget is available
try {
    $null = winget --version 2>&1
    Write-Host "✓ winget is available" -ForegroundColor Green
    Write-Host ""
    Write-Host "You can install Python using winget:" -ForegroundColor White
    Write-Host ""
    Write-Host "  winget install Python.Python.3.12" -ForegroundColor Cyan
    Write-Host "  or" -ForegroundColor Gray
    Write-Host "  winget install Python.Python.3.11" -ForegroundColor Cyan
    Write-Host ""
    
    $useWinget = Read-Host "Would you like to install Python using winget now? (Y/N)"
    
    if ($useWinget -eq "Y" -or $useWinget -eq "y") {
        Write-Host "Installing Python 3.12 using winget..." -ForegroundColor Cyan
        Write-Host "This may take a few minutes..." -ForegroundColor Yellow
        Write-Host ""
        
        try {
            winget install Python.Python.3.12 --accept-package-agreements --accept-source-agreements
            Write-Host ""
            Write-Host "✓ Python installation completed!" -ForegroundColor Green
            Write-Host ""
            Write-Host "Please restart your terminal and run:" -ForegroundColor Yellow
            Write-Host "  python --version" -ForegroundColor White
            Write-Host ""
        }
        catch {
            Write-Host "⚠ Installation may have failed. Please try manual installation." -ForegroundColor Yellow
        }
    }
}
catch {
    Write-Host "⚠ winget is not available on this system" -ForegroundColor Yellow
    Write-Host "  (This is normal on older Windows versions)" -ForegroundColor Gray
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "After Installation" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Restart your terminal/PowerShell" -ForegroundColor Yellow
Write-Host "2. Verify installation:" -ForegroundColor Yellow
Write-Host "   python --version" -ForegroundColor White
Write-Host ""
Write-Host "3. Install bot dependencies:" -ForegroundColor Yellow
Write-Host "   cd PythonVersion" -ForegroundColor White
Write-Host "   pip install -r requirements.txt" -ForegroundColor White
Write-Host ""
Write-Host "4. Run the bot:" -ForegroundColor Yellow
Write-Host "   python -m src.main" -ForegroundColor White
Write-Host ""
