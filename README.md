# ⚡ ToolHub AI — Evolution v3.0

> High-performance quiz platform with Boss Battles, Betting, Streaks, Creator Studio & 50k Strategy

---

## 🎮 New Engagement Features

### 🎰 Betting Mechanic
- Before every 4th question, users can wager earned points
- Presets: Skip / ¼ / ½ / All-In
- Win → bonus points added; Lose → wager subtracted
- Tracked in the final results and DB (`bets_won` column)

### 🔥 Boss Battle System
- Every 5th question (index 4, 9, 14…) automatically becomes a Boss Battle
- Or set `isBoss: true` in any question JSON
- Timer shrinks by 40-60% depending on boss tier
- 3D rotating boss enemy appears with HP bar animation
- Boss background turns deep crimson; points are 1.5× on correct answer
- Final boss questions support `isFinalBoss: true` flag for extra drama

### 🌊 Gravity Flip (Wildcard)
- New wildcard type: `gravity_mode` — flips the entire UI 180°
- CSS `transform: rotate(180deg)` applied to `quiz-player-wrap`
- Text elements counter-rotated so they remain readable
- Combined with `mirror_mode` in `reality_shift` wildcard

### 🎭 Reality Shift (Wildcard)
- New wildcard: `reality_shift` — applies BOTH mirror flip AND gravity flip
- Then spawns a Secret Dimension bonus question
- Unique to the JackSucksAtLife quiz

### 🔍 Heatmap / Image Click Questions
- New question type: `heatmap`
- Shows an image with 4 multiple-choice answer options below
- Server-side future enhancement: click coordinates → correct zone detection

### 🔥 Streaks & Visual Evolution
- Streak counter tracked in real time
- At **3+ streak**: subtle glow + streak indicator badge appears
- At **5+ streak**: intensified glow effect
- At **8+ streak**: pulsing max-streak animation + particle burst (⭐🔥💫✨⚡)
- Streak resets on wrong answer or timeout
- `streakMax` saved to database for leaderboard

### 🎭 Meme-ify Toggle
- Button in quiz header to toggle Meme-ify mode
- Shows a floating panel with 5 sound effect buttons (Web Audio API — no external CDN)
- Sound effects: Air Horn, Wow, Sad, Bruh, GG
- Auto-plays GG on correct / Sad on wrong when active

---

## 🎬 Featured: JackSucksAtLife Quiz (Starter)

- **Quiz ID**: `starter-jacksucksatlife`
- **Category**: Pop Culture
- **10 questions** covering YouTube Play Buttons, channel history, milestones
- **Boss Battles** at Q5 (Gold Play Button milestone) and Q10 (Final Boss: 500pt question)
- **Wildcards**: `world_swap`, `reverse_mode`, `mirror_mode`, `secret_dimension`, `gravity_mode`
- **YouTube theme**: `youtube_theme: true` flag in wildcard config
- **3D Play Button** showcase object available in Profile

---

## 🏅 Profile & Social Enhancements

### Dynamic Badges (SVG)
Badges auto-computed from play/quiz/score history:
| Badge | Condition |
|-------|-----------|
| First Play 🎮 | 1+ quiz played |
| Quiz Fan ⭐ | 10+ plays |
| Trivia Addict 🧠 | 50+ plays |
| Trivia Master 🏆 | 100+ plays |
| Quiz Creator ✏️ | Created 1+ quiz |
| Prolific Creator 🔥 | Created 5+ quizzes |
| High Scorer 🥇 | 80%+ on any quiz |
| Perfectionist 💎 | 100% on any quiz |

Each badge renders as an SVG with a radial gradient ring — no images required.

### Showcase Pedestal
- 3D object displayed on a styled pedestal in your profile
- New object type: `youtube` (YouTube Play Button shape with triangle)
- Camera slightly elevated for "looking up at award on pedestal" feel
- Soft glow shadow underneath the pedestal

### Creator Studio
- Route: `/api/quiz/studio` (auth required)
- Shows: total plays, total likes, average score %, top score
- Per-quiz play bar chart (relative width bars)
- Recent players feed with time-ago formatting
- Access from Profile page via "Open Creator Studio →" button

---

## 🗄️ 50k Strategy — Technical Architecture

### Storage
- All quiz content stored in PostgreSQL as gzip+base64 compressed data
- A 10KB quiz → ~2KB stored = **~500,000 quizzes per GB** of DB storage
- Compression handled by `zlib.gzip` / `zlib.gunzip`

### Persistence
- Session store: PostgreSQL (`connect-pg-simple`)
- Render persistent disk: `/data` (1GB, survives restarts and redeploys)
- `DATA_DIR` env variable configurable
- `/data/quizzes/` directory for future file-based quiz assets

### Atomic Writes
- `atomicWriteJSON(filePath, data)` utility in `db/quiz-db.js`
- Writes to `.tmp_${Date.now()}` then `fs.renameSync()` (atomic on Linux)
- Prevents partial writes on crash

### Paginated List API
- `/api/quiz/list?page=N&limit=12&category=X&search=Q&sort=plays`
- Uses SQL `LIMIT` + `OFFSET` — handles 10,000+ entries with constant-time queries
- Indexed on `status`, `plays DESC` for fast sorting

---

## 🚀 Deployment (Render)

```yaml
# render.yaml
disk:
  name: toolhub-data
  mountPath: /data
  sizeGB: 1
```

```
npm install
node server.js
```

**First deploy**: Seeds 4 starter quizzes including JackSucksAtLife flagship quiz.

---

## ✅ Delivery Checklist

- [x] All existing tools 100% functional (zero changes to tool routes/logic)
- [x] UI overlap-free on mobile (320px) through 4K via responsive CSS
- [x] Persistence: PostgreSQL sessions + Render disk survive redeploys
- [x] JackSucksAtLife quiz fully implemented with Boss Battles, Wildcards, 3D
- [x] Quiz list pagination handles 10,000+ with indexed SQL queries
- [x] Atomic writes for file-based data
- [x] Creator Studio analytics dashboard
- [x] Dynamic SVG badges
- [x] Showcase Pedestal with 7 object types including YouTube Play Button
- [x] Betting mechanic (wager points, double or nothing)
- [x] Boss Battle system (every 5th Q, 3D enemy, accelerated timer)
- [x] Gravity Flip wildcard (entire UI rotates 180°)
- [x] Reality Shift wildcard (mirror + gravity + secret question)
- [x] Streak system (visual evolution at 3/5/8 streak)
- [x] Meme-ify toggle (5 Web Audio sound effects)
- [x] Heatmap question type (image + multiple choice)
