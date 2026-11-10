# RankBid AI Swarm & Autonomous Engineering Directives

## Workspace Overview
- **Canonical Repository:** `G:\My Drive\RankBid`
- **Language:** Roman Hindi (Hindi with English alphabet) for user interactions.
- **Local Runtime Cache:** `%LOCALAPPDATA%\RankBid\runtime` (Do not edit directly; syncs automatically).
- **Active Database:** `%USERPROFILE%\.rankbid\rankbid.db` (Do not run active SQLite in cloud sync folder).
- **Snapshots:** Saved in `storage-backups`.

## Autonomous AI Swarm & Zero-Token Engine
When building features, generating apps, or running autonomous tasks, use the multi-provider swarm engine:
```bash
python scripts/ai_swarm_engine.py build-app --name <app_name> --prompt "<prompt>"
python scripts/ai_swarm_engine.py chat "<query>"
python scripts/ai_swarm_engine.py voice --text "<text>" --out scratch/voice.mp3
python scripts/ai_swarm_engine.py video --topic "<topic>" --out scratch/video.mp4
```

## Running & Developing RankBid
- **Run Production App:** `run_website.bat` or `powershell scripts/start-local.ps1`
- **Run Official Site:** `official-site/run_official.bat`
- **Build / Audit:** `node scripts/build-local.cjs`

## 74 AI Ecosystem Failover Policy
- Never halt execution due to token limits.
- The router automatically fails over:
  1. OpenRouter Free Tier (`nvidia/nemotron-3-ultra-550b-a55b:free`, `google/gemma-4-31b-it:free`)
  2. Zhipu GLM-4-Flash (`https://open.bigmodel.cn`)
  3. NVIDIA NIM (`https://integrate.api.nvidia.com`)
  4. Local Safe Heuristics Engine
