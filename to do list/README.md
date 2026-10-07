# new~step: to do list

A clean daily task manager built with React + TypeScript + Vite + Supabase.

## Included

- Supabase email/password accounts
- Name + phone profile
- Private tasks per user using PostgreSQL RLS
- Add / edit / delete tasks
- Choose a task date
- Complete tasks with a green check
- Past incomplete tasks are shown as "Missed" in red
- Daily progress percentage
- Progress bar + visual status legend
- Search
- Responsive mobile layout
- White background, black icons, blue/green data accents and red missed state

## Setup

1. Install the current Node.js LTS version (it must include `npm`).
2. Create a Supabase project.
3. In Supabase SQL Editor, run `supabase/schema.sql`.
4. Copy `.env.example` to `.env.local`.
5. Put your Supabase URL and publishable key in `.env.local`.
6. Run:

```bash
npm install
npm run dev
```

Then open the local address printed by Vite (normally `http://localhost:5173`).
Do **not** double-click `index.html`: it is the Vite entry point, not a
standalone webpage, so a browser cannot load the React/TypeScript source files
from disk and will show a blank white page.

## Build

```bash
npm run build
```

The deployable website is created in `dist/`. Upload that folder to a static
hosting service (for example Netlify, Vercel, or Cloudflare Pages). It still
needs to be opened through a web server; double-clicking an HTML file is not a
supported way to run a React/Vite app.

## Important

The project intentionally does not contain real Supabase credentials. Use a publishable client key in the browser and keep any service-role key off the frontend.

## Design direction

The UI takes inspiration from modern productivity/Todo projects on GitHub, while the implementation here is original and focused on the requested new~step workflow.
