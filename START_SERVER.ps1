# 長良川カヌーゲーム - ローカルサーバー起動スクリプト (PowerShell)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  長良川カヌーゲーム - ローカルサーバー" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check for Python
$pythonExists = Get-Command python -ErrorAction SilentlyContinue
if ($pythonExists) {
    Write-Host "Python を使用してサーバーを起動します..." -ForegroundColor Green
    Write-Host "ブラウザで http://localhost:8000 を開いてください" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "終了するには Ctrl+C を押してください" -ForegroundColor Yellow
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    
    # Start server and open browser
    Start-Process "http://localhost:8000/debug.html"
    python -m http.server 8000
    exit
}

# Check for Node.js
$nodeExists = Get-Command node -ErrorAction SilentlyContinue
if ($nodeExists) {
    Write-Host "Node.js を使用してサーバーを起動します..." -ForegroundColor Green
    Write-Host "ブラウザで http://localhost:8000 を開いてください" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "終了するには Ctrl+C を押してください" -ForegroundColor Yellow
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    
    # Start server and open browser
    Start-Process "http://localhost:8000/debug.html"
    npx http-server -p 8000
    exit
}

# No server found
Write-Host ""
Write-Host "エラー: Python または Node.js がインストールされていません" -ForegroundColor Red
Write-Host ""
Write-Host "以下のいずれかをインストールしてください:" -ForegroundColor Yellow
Write-Host "  - Python: https://www.python.org/downloads/" -ForegroundColor White
Write-Host "  - Node.js: https://nodejs.org/" -ForegroundColor White
Write-Host ""
Read-Host "Press Enter to exit"
