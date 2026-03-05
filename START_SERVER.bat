@echo off
echo ========================================
echo   長良川カヌーゲーム - ローカルサーバー
echo ========================================
echo.
echo サーバーを起動しています...
echo ブラウザで http://localhost:8000 を開いてください
echo.
echo 終了するには Ctrl+C を押してください
echo ========================================
echo.

REM Try Python 3 first
python --version >nul 2>&1
if %errorlevel% equ 0 (
    echo Python 3 を使用してサーバーを起動します...
    python -m http.server 8000
    goto :end
)

REM Try Python 2
python2 --version >nul 2>&1
if %errorlevel% equ 0 (
    echo Python 2 を使用してサーバーを起動します...
    python2 -m SimpleHTTPServer 8000
    goto :end
)

REM Try Node.js
node --version >nul 2>&1
if %errorlevel% equ 0 (
    echo Node.js を使用してサーバーを起動します...
    npx http-server -p 8000
    goto :end
)

echo.
echo エラー: Python または Node.js がインストールされていません
echo.
echo 以下のいずれかをインストールしてください:
echo   - Python: https://www.python.org/downloads/
echo   - Node.js: https://nodejs.org/
echo.
pause

:end
