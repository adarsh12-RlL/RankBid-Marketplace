# RankBid ab Google Drive mein hai

Permanent project: `G:\My Drive\RankBid`

Mounted Google Drive account ki local metadata se `iamkids2002@gmail.com` ke saath mapping verify hui hai. Files folder mein save aur compare ki gayi hain; cloud upload ka final status Google Drive Desktop dikhata hai.

- Code, documentation aur `.env.local` mein future edits isi folder mein karein.
- Website ke liye `run_website.bat` kholein. Browser address `http://localhost:3000` hi hai.
- Normal launcher optimized build reuse karta hai. Code badalne ke baad server band karke dobara launch karein. Live code editing ke liye `develop_website.bat` hai.
- Launcher latest Drive source ko `%LOCALAPPDATA%\RankBid\runtime` ke disposable cache mein sync karke chalata hai. Is local copy mein manually edit na karein.
- Existing dependencies reuse hoti hain; ek aur 490 MB dependency copy nahi banayi gayi. Local execution aur Google Drive streaming ka cache kuch device storage leta hai; storage zero hone ka claim nahi hai.
- Active financial database `%USERPROFILE%\.rankbid\rankbid.db` par local rehta hai. Sync folder mein open SQLite/WAL database chalane ke badle, verified consistent snapshots `storage-backups\rankbid-latest.db` aur `rankbid-previous.db` mein save hote hain.
- Server start, har 60 seconds aur normal server shutdown par backup update hota hai. Server band hone par backup timer nahi chalta. Backup failure terminal mein bataya jata hai.
- `backups\before-move-*.zip` original source/settings ka migration backup hai. `data` purane records preserve karta hai; active database alag hai.
- `C:\Users\coool\rankbid_app` aur purana `new work` ab retired launch points hain; current project yahi hai.

Keys aur Google login setup ke liye `KEYS_SETUP_HINDI.md` dekhein. Migration password reset, merchant activation ya Google OAuth setup nahi karta.
