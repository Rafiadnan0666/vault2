# 🧠 Ideas

**Ideas** (formerly Vaultify) is your personal, secure, and minimalist idea vault. Jot down thoughts, save inspirations, draft billion-dollar startups — without the noise. Built for creators who think fast and store smart.

---

## 🚀 Features

- 🔒 Private by default — your thoughts, your eyes only
- 🔍 Full-text search so you never lose a spark
- 🧱 Simple and clean UI focused on writing
- ☁️ Supabase/SQLite backend (configurable)

---

## 📦 Tech Stack

- Frontend: Next.js + Tailwind CSS
- Backend: Supabase (PostgreSQL, Auth, Realtime)
- Deployment: Vercel / Netlify / Your choice
- Storage: Supabase Bucket (optional for attachments)

---

## 🛠️ Getting Started

```bash
git clone https://github.com/yourusername/ideas.git
cd ideas
npm install
npm run dev
Make sure to set up your .env.local:

env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key

📁 Folder Structure
bash
/components     → UI components
/pages          → Next.js routes
/utils          → Supabase client, helpers
/types          → Type definitions
/styles         → Global Tailwind config
📌 Roadmap
 Core note editor

 User auth (Supabase)

 Attachments & media support

 AI auto-tagging (OpenAI embedding)

 Shareable public notes

🤝 Contributing
Pull requests are welcome! For major changes, open an issue first to discuss what you want to change. Keep it clean, keep it smart.