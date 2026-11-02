# Bus&Go Ltd

A marketplace in Kampala where schools hire out their idle buses to churches, companies, tour groups and other schools.

**To launch the site, follow [docs/LAUNCH.md](docs/LAUNCH.md).**

## What it does

- **Hirers:** search buses by date and size, see availability, send booking requests, track status, see payment instructions, cancel.
- **Schools:** apply with documents, add buses with photos and documents, set prices, block school-use days on a calendar, accept or decline requests, mark trips done.
- **Bus&Go team (admin):** approve schools, record bus inspections and put buses live, record deposits, see every booking, manage commission, deposit percentage and contact details.

Security is enforced in the database (row-level security and triggers in `supabase/migrations/0001_init.sql`):
schools can't approve themselves, hirers can't confirm their own bookings or change prices,
blocked and booked days can't be double-booked, documents and payout details are private,
and a hirer gets the school's contact only after the deposit is recorded.

## Stack

Next.js 15 (App Router) · Supabase (Postgres, Auth, Storage) · hosted on Vercel.

## Run it on your computer

Requires Node 20+ and Docker.

```bash
npm install
npx supabase start          # local database, login and file storage
cp .env.example .env.local  # then paste the API URL and anon key that `supabase start` printed
npm run dev                 # http://localhost:3000
```

Make yourself admin locally: sign up, then
`psql postgresql://postgres:postgres@127.0.0.1:54322/postgres -c "update profiles set role='admin' where email='you@example.com'"`.

## Folders

- `app/`: pages (`/buses`, `/account`, `/school`, `/admin` and others)
- `components/`: shared parts (calendar, uploads, forms)
- `lib/`: Supabase clients, formatting, email alerts
- `supabase/migrations/`: the database schema
- `prototype/`: the original clickable demo (open `prototype/index.html`)
