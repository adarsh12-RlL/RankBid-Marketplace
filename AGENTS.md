# RankBid workspace

- User ka authorised permanent project folder `G:\My Drive\RankBid` hai. RankBid ka code, documentation, configuration aur future edits isi Google Drive folder mein save karein.
- User ke saath Hindi mein English letters (Roman Hindi) mein baat karein.
- `%LOCALAPPDATA%\RankBid\runtime` sirf generated local runtime/dependency cache hai. Us copy mein manually code edit na karein; canonical Drive source ko launcher automatically sync karta hai.
- `run_website.bat` ya `scripts/start-local.ps1` se app start karein. Test/build/admin ke liye launcher ka matching `-Mode` use karein. Dependencies/build caches Drive mein install na karein.
- Active SQLite database `%USERPROFILE%\.rankbid\rankbid.db` par local rahega; consistent snapshots `storage-backups` mein save hote hain. Open SQLite/WAL files ko sync folder mein active database ki tarah na chalayein.
- Credentials canonical `.env.local` mein locally set hote hain. Secrets chat, logs, public files ya Git mein na dikhayein. Drive account ownership ya completed cloud upload bina evidence claim na karein.
- `C:\Users\coool\rankbid_app` aur `G:\My Drive\new ideas\new work` retired locations hain; wahan ke old code se app overwrite na karein.
- Existing payment verification, fixed Stripe recipient, customer gateway choice, ownership and Google OAuth checks preserve karein. Demo/cached amounts ko verified payments ya real analytics na banayein.
