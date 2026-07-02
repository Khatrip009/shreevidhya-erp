# ShreeVidhya ERP

A React, Vite, and Supabase based ERP for ShreeVidhya Academy.

## Features

- Role-based dashboards for admins, teachers, students, and parents
- Admissions, student profiles, batches, courses, subjects, and mediums
- Attendance, homework, exams, results, certificates, and progress reports
- Fees, receipts, income, expenses, tax reports, salaries, and profit/loss
- Notifications, learning resources, online classes, and AI assistant

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Copy the environment template and fill in local values:

```bash
cp .env.example .env
```

3. Start the development server:

```bash
npm run dev
```

## Scripts

```bash
npm run dev
npm run build
npm run lint
npm run preview
```

## Security Notes

- Keep `.env`, private keys, and Supabase/Jitsi/Groq secrets out of git.
- Store edge-function secrets in Supabase project secrets.
- Database schema, migrations, and row-level security policies should be versioned under `supabase/migrations`.
