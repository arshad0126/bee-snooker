# 🐝 Bee Snooker — Every Shot Counts

Bee Snooker is a premium, real-time snooker scoring controller, ELO tracker, and match database. Built with a modern, Apple-inspired matte design and featuring a tactile 3D felt-effect table, it makes scoring frames, tracking stats, and monitoring player progression effortless.

---

## ✨ Key Features

* **🎱 Apple-Inspired Matte UI:** Sleek, high-contrast interface with tactile 3D ball models, glowing neon indicators, and glassmorphic player card layouts.
* **📱 Landscape Mobile Controller:** Specifically optimized for landscape mobile viewports, allowing players next to the table to use it comfortably as a physical remote control.
* **📊 Dual-Storage Layer:** 
  * **Local Mode (Default):** Runs completely offline using an in-browser `localStorage` database simulator for instant out-of-the-box usage.
  * **Remote Mode:** Connects to a live hosted PostgreSQL database on **Supabase** with secure Row-Level Security (RLS) policies.
* **⚡ Real-time Specator Sync:** Subscribe to live postgres channels to synchronize multiple tablets, screens, or phones so that spectators can watch the score update in real-time.
* **🧠 Snooker Scoring Engine:**
  * Automated rotation/turn advance and breaker assignment.
  * Live calculations of points remaining, leads, and snookers required.
  * **Interactive Foul Checks:** Verifies color pots when red is on and supports complex fouls (like cue ball in-off while pocketing a red).
* **🏆 Multiplayer & Team ELO:**
  * Uses a customized multiplayer ELO formula (treating FFA as $N(N-1)/2$ pairwise matches without rating inflation).
  * Automatically updates rankings after frame completion.
  * Live Hall of Fame dashboard (Highest Frame, Win-rates, Lifetime points, and Active participation).

---

## 🛠️ Tech Stack

* **Frontend Framework:** Next.js (App Router, React 19)
* **Styling & Theme:** TailwindCSS v4 + Framer Motion (for smooth micro-animations)
* **Database & Auth:** Supabase Client wrapper with custom local-storage simulator fallback
* **State Management:** Zustand Event-Sourced store
* **Testing:** Vitest + JSDOM

---

## 🚀 Getting Started

### 1. Installation
Clone the repository and install the dependencies:
```bash
npm install
```

### 2. Environment Configuration
By default, the app runs in **Local Mode** using your browser's local storage. To connect to a live Supabase database, copy [.env.example](file:///c:/Users/hp/.gemini/antigravity-ide/scratch/bee-snooker/.env.example) to `.env.local`:
```bash
cp .env.example .env.local
```
Then, populate it with your Supabase URL and Anon Key:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-actual-anon-key-here
```

### 3. Database Migration (Optional for Remote Mode)
If using Supabase, copy the contents of the database migration file: [20260621000000_init_schema.sql](file:///c:/Users/hp/.gemini/antigravity-ide/scratch/bee-snooker/supabase/migrations/20260621000000_init_schema.sql) and execute it inside the **SQL Editor** on your Supabase dashboard. This sets up all tables, RLS policies, and enables realtime replication.

### 4. Running Locally
Start the development server:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🧪 Testing

The codebase has robust unit tests covering snooker logic, ELO adjustments, and Zustand match store events.

To run the tests:
```bash
npm run test
```
To build for production verification:
```bash
npm run build
```
