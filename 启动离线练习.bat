@echo off
chcp 65001 >nul
title 慢慢来 - 家庭词语练习
cd /d "%~dp0"

set "NODE_EXE=C:\Users\马欣怡\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
if not exist "%NODE_EXE%" set "NODE_EXE=node"

start "" "http://127.0.0.1:3100/"
"%NODE_EXE%" "scripts\offline-server.mjs"

if errorlevel 1 (
  echo.
  echo 启动失败，请把这个窗口的内容告诉 Codex。
  pause
)
