# Launching Bus&Go

This takes about an hour. You need a laptop, an email address, and your GitHub login (neville03).
Everything below is free to start.

## 1. Create the database (Supabase), about 15 minutes

1. Go to https://supabase.com, sign up, and click **New project**.
   - Name: `busandgo`
   - Database password: make a strong one and save it in a password manager.
   - Region: **West EU (Ireland)** or **Central EU (Frankfurt)**. Both are close enough to Uganda.
2. When the project is ready, open **SQL Editor**, click **New query**, paste the whole of
   `supabase/migrations/0001_init.sql` from this repo, and click **Run**. It should say "Success".
3. Open **Project Settings → API** and copy two values:
   - **Project URL** (looks like `https://abcd.supabase.co`)
   - **anon public** key (a long string)
4. Open **Authentication → URL Configuration**:
   - Site URL: your website address, e.g. `https://busandgo.co.ug` (or the Vercel address from step 2 for now)
   - Redirect URLs: add `https://YOUR-ADDRESS/auth/callback`

## 2. Put the website online (Vercel), about 10 minutes

1. Go to https://vercel.com and **sign up with GitHub**.
2. Click **Add New → Project**, pick **neville03/Bus-GoLTD**, and click **Import**.
3. Under **Environment Variables** add:
   | Name | Value |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | the Project URL from step 1.3 |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | the anon public key from step 1.3 |
   | `NEXT_PUBLIC_SITE_URL` | your website address, e.g. `https://busandgo.co.ug` |
4. Click **Deploy**. After about two minutes you get a link like `bus-goltd.vercel.app`.
   Put that address into Supabase step 1.4 if you don't have a domain yet.

## 3. Make yourself the admin, about 2 minutes

1. On your new website, click **Sign in → Create an account** and sign up with your own email.
2. In Supabase **SQL Editor**, run (with your email):
   ```sql
   update profiles set role = 'admin' where email = 'you@example.com';
   ```
3. Sign out and back in. You now see **Admin** in the top bar.
4. In **Admin → Settings**, fill in your support phone, WhatsApp number, email, and the
   **deposit payment instructions** (your MTN and Airtel merchant or business numbers).
   Hirers see these once a school accepts their booking.

## 4. Emails (needed before real users sign up), about 20 minutes

Supabase's built-in email only sends a few messages per hour, which is not enough for sign-ups.
Use Resend (free for 3,000 emails a month):

1. Sign up at https://resend.com and add your domain (e.g. `busandgo.co.ug`). Resend shows DNS records;
   add them where you bought the domain.
2. In Resend create an **API key**.
3. In Supabase, open **Project Settings → Authentication → SMTP Settings**, turn on custom SMTP:
   host `smtp.resend.com`, port `465`, user `resend`, password = the API key, sender `no-reply@busandgo.co.ug`.
4. In Vercel, add these environment variables, then redeploy (**Deployments → ⋯ → Redeploy**):
   | Name | Value |
   |---|---|
   | `RESEND_API_KEY` | the Resend API key |
   | `ALERT_EMAIL_TO` | the team inbox for new applications and bookings (comma-separate several) |
   | `ALERT_EMAIL_FROM` | `Bus&Go <alerts@busandgo.co.ug>` |

## 5. Your own domain (optional), about 15 minutes plus waiting

Buy `busandgo.co.ug` from a Ugandan registrar (or `.com` anywhere). In Vercel open
**Settings → Domains**, add it, and copy the DNS records Vercel shows into your registrar.
Then update the Site URL and Redirect URL in Supabase (step 1.4) and `NEXT_PUBLIC_SITE_URL` in Vercel.

---

## How a booking runs (manual payments for now)

1. **A school signs up** and uploads its documents. You get an email. In **Admin → To review**,
   open the documents, call the school if anything is unclear, then **Approve** or **Ask for changes**.
2. **The school adds a bus** with photos, logbook and insurance, then sends it for inspection.
   Arrange the inspection with your partner garage. When it passes, enter the date and garage
   and click **Inspection passed: go live**. The bus now appears in search.
3. **A hirer sends a request.** The school sees it on its dashboard (you get an email too, so you can
   nudge them on WhatsApp). The school accepts or declines.
4. **The hirer pays the deposit** to your mobile money number using the booking reference.
   When the money arrives, open **Admin → To review → Deposits to collect**, type the
   transaction ID, and click **Deposit received**. The hirer then sees the school's contact.
5. **Collect the balance** at least 48 hours before the trip (same way; add a note on the booking).
6. **After the trip**, the school clicks **Trip done**. Pay the school its share
   (total minus commission) to the payout number on its profile (**Admin → Schools**).

## What is not built yet

- Online payments (Flutterwave, Pesapal or MTN/Airtel APIs): deposits are recorded by hand for now.
- SMS and WhatsApp messages: emails only. Use the WhatsApp links in Admin to message people.
- The driver app, mechanic portal, rewards and holiday programmes from the original brief.
- Sign-in by phone number (Supabase needs a paid SMS provider for this).

## Before you take real customers

- [ ] Have a Ugandan lawyer review `/terms` and `/privacy` (both are marked as drafts on the site).
- [ ] Register with the Personal Data Protection Office (Data Protection and Privacy Act, 2019).
- [ ] Confirm the licences needed for commercial hire of school buses, and which insurers cover it.
- [ ] Open business mobile money accounts (MTN MoMo and Airtel Money) for deposits and payouts.
- [ ] Sign a short agreement with each partner garage and each pilot school.
- [ ] Turn on Supabase backups (Project Settings → Database). Daily backups need the Pro plan (US$25 a month).
