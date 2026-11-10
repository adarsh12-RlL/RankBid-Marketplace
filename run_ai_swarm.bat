@echo off
chcp 65001 >nul
title RankBid Autonomous AI Swarm Hub
cd /d "G:\My Drive\RankBid"
cls

echo =====================================================================
echo           ⚡ RANKBID AUTONOMOUS AI SWARM & ZERO-TOKEN HUB ⚡
echo =====================================================================
echo  Connected To: Claude Code, OpenAI Codex, Antigravity IDE, ChatGPT
echo  Zero Token Exhaustion: Multi-Provider Failover Enabled
echo =====================================================================
echo.
echo  [1] Automatically Build ^& Run a New Web App (from Prompt)
echo  [2] Run / Serve an Existing Generated Web App
echo  [3] Ask / Code with Zero-Token Multi-Model Brain (Swarm)
echo  [4] Generate Free Neural Voice / Speech (ElevenLabs Pro Alternative)
echo  [5] Generate Free AI Image (Midjourney Pro Alternative)
echo  [6] Generate Automated Video (InVideo / CapCut Pro Alternative)
echo  [7] Launch Main RankBid Platform (run_website.bat)
echo  [8] Run Full Harness Health Audit
echo  [9] Exit
echo.
set /p choice="Select an option (1-9): "

if "%choice%"=="1" (
    echo.
    set /p app_name="Enter Application Name (e.g. ai-crypto-hub): "
    set /p app_prompt="Describe what the app should do: "
    python scripts\ai_swarm_engine.py build-app --name "%app_name%" --prompt "%app_prompt%"
    pause
    goto :eof
)

if "%choice%"=="2" (
    echo.
    set /p app_name="Enter Application Name to Run (e.g. rankbid-analytics): "
    python scripts\ai_swarm_engine.py serve --name "%app_name%"
    pause
    goto :eof
)

if "%choice%"=="3" (
    echo.
    set /p query="Enter your question or coding request: "
    python scripts\ai_swarm_engine.py chat "%query%"
    pause
    goto :eof
)

if "%choice%"=="4" (
    echo.
    set /p voice_text="Enter text to speak: "
    set /p out_file="Enter output mp3 file (e.g. scratch/my_voice.mp3): "
    python scripts\ai_swarm_engine.py voice --text "%voice_text%" --out "%out_file%"
    pause
    goto :eof
)

if "%choice%"=="5" (
    echo.
    set /p img_prompt="Enter image prompt: "
    set /p img_out="Enter output jpg file (e.g. scratch/my_image.jpg): "
    python scripts\ai_swarm_engine.py image --prompt "%img_prompt%" --out "%img_out%"
    pause
    goto :eof
)

if "%choice%"=="6" (
    echo.
    set /p vid_topic="Enter video topic: "
    set /p vid_out="Enter output mp4 file (e.g. scratch/my_video.mp4): "
    python scripts\ai_swarm_engine.py video --topic "%vid_topic%" --out "%vid_out%"
    pause
    goto :eof
)

if "%choice%"=="7" (
    call run_website.bat
    goto :eof
)

if "%choice%"=="8" (
    python scripts\ai_swarm_engine.py test-harnesses
    pause
    goto :eof
)

echo Exiting...
