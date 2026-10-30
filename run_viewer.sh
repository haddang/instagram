#!/usr/bin/env bash
# Instagram DM Archive Viewer Launcher
# Double-click this file or run ./run_viewer.sh to open in your default browser.

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR"

echo "Instagram DM Viewer를 시작합니다..."

# Check if chat_data.js exists; if not, build it first
if [ ! -f "chat_data.js" ]; then
    echo "데이터 파일(chat_data.js)을 생성 중입니다..."
    python3 build_viewer.py
fi

# Open directly in default web browser
open index.html

echo "브라우저에서 열렸습니다!"
