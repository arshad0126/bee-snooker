# 🐝 Bee Snooker — Every Shot Counts

Bee Snooker is a premium, real-time snooker scoring controller, ELO tracker, and match database. Built with a modern, Apple-inspired matte design, it is optimized as an installed Progressive Web App (PWA) for mobile devices.

---

## ✨ Key Features

* **📱 Hybrid Portrait & Landscape Experience:**
  * **Portrait Mode:** Allowed for Login, Dashboard, Club/Session Setup, Player Management, Statistics, Analytics, Leaderboards, and Settings.
  * **Landscape Mode (Match Mode):** Once a frame is started, the app enters a locked Match Mode. If a user holds their device in portrait, a premium fullscreen backdrop blocks inputs: *"Please rotate your device to landscape mode to continue."*

* **🎱 iPhone 16 Pro Max Landscape Match Layout:**
  * **Top Row:** Displays Frame count (e.g. Frame 3), Active Club Name, real-time Sync Status, and shortcuts for Time Analytics, Timeline Logs, and the "End Frame" actions.
  * **Scoreboard:** Rendered immediately below the header as a single row of equal-width, equal-height side-by-side player cards with no scrolling. Shows player name, score, frame wins, current break, and live timers.
  * **Frame Status Row:** A flat, single-line horizontal bar displaying Ball On, Reds Left, Points Left, Lead, Active Striker, and Secured/Active state.
  * **Controller Panel:** A highly compact, thumb-friendly 7-column inline scoring grid (`RED`, `YEL`, `GRN`, `BRN`, `BLU`, `PNK`, `BLK`) and a large action bar (`Undo`, `Foul`, `Pass`).

* **⏱️ Real-time Visit & Shot-Level Analytics:**
  * Tracks individual player visits (e.g. Visit 1: 00:18, Visit 2: 00:45).
  * Automatically calculates average shot time, fastest/slowest visits, and time share per player.
  * Dynamically updates live visit and total timers on player cards every second using elapsed time since the last action.

* **🔁 YES/NO Frame Restart Flow:**
  * Ending a frame transitions back to portrait to show the **Frame Completed Summary** page with player scores, visit stats, and duration.
  * Prompts the user: *"Start another frame?"*
    * **YES:** Reuses the current configuration (players, teams, mode) and prompts: *"Who breaks this frame?"* with a selectable player list, then launches the next frame.
    * **NO:** Returns the user to the normal portrait-friendly session dashboard.

* **🔐 Google Auth & Cross-Device Sync:**
  * Secure Google OAuth integration via Supabase.
  * **Cross-Device Discovery:** Logs in with Google and automatically queries all owned groups (`owner_id = user.id`) from the database, merging them with the local cache so clubs are accessible on new devices instantly.
  * Safe-area notch padding (`env(safe-area-inset-top/bottom/left/right)`) integrated into components.

* **⚡ Real-time Spectator Sync:**
  * Uses live postgres replication channels to synchronize multiple tablets, spectator screens, or mobile devices in real-time.

---

## 🛠️ Tech Stack

* **Frontend Framework:** Next.js (App Router, React 19)
* **Styling & Theme:** TailwindCSS v4 + Custom animations
* **Database & Auth:** Supabase Client with event-driven RLS policies
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
By default, the app runs in **Local Mode** using your browser's local storage. To connect to a live Supabase database, copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```
Then, populate it with your Supabase URL and Anon Key:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-actual-anon-key-here
```

### 3. Database Migration (Optional for Remote Mode)
If using Supabase, apply the SQL schema files under `supabase/migrations/` in sequence using the **SQL Editor** on your Supabase dashboard. This sets up tables, RLS policies, indexes, and triggers.

### 4. Running Locally
Start the development server:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🧪 Testing & Verification

The codebase has robust unit tests covering snooker logic, ELO adjustments, and Zustand match store events.

To run the unit tests:
```bash
npm run test
```
To build and check production compilation:
```bash
npm run build
```
