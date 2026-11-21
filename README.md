# Talent Acquisition Tracker

A private job application tracker built with Next.js, Tailwind CSS, and Supabase. The signed-out view shows fictional sample jobs. Sign in to add applications and edit cells directly in the table. Press Enter or Tab to save a cell, or Esc to cancel. Use the row’s **Job details** button to edit notes or delete the job.

## Run locally

Use Node.js 22.18 or later. If `.env.local` is missing, copy `.env.example` to `.env.local` and add the project’s publishable key. Install dependencies and start Next.js.

```sh
npm ci
npm run dev
```

Open [localhost:3000](http://localhost:3000). For a new Supabase project, run the [applications migration](supabase/migrations/20261121000000_create_applications.sql) once in the SQL Editor. The migration is already applied if the `applications` table and its access policy exist.

To enable username signup and sign-in, run the [username migration](supabase/migrations/20261121010000_add_account_usernames.sql) in the SQL Editor. Add the project’s Supabase secret key (`sb_secret_…`) as `SUPABASE_SECRET_KEY` in `.env.local` and restart the dev server. Keep this variable server-only. Existing users can sign in with email and use **Set username** in the tracker.

Enable the email provider in Supabase Auth and allow `http://localhost:3000/auth/callback` in **Authentication → URL Configuration → Redirect URLs**. If email confirmation is enabled, open the confirmation link in the browser where you signed up. To send confirmation emails to people outside your Supabase project team, configure custom SMTP in Supabase.

## Deploy to Vercel

Import the Git repository as a Next.js app or run `npx vercel` to link this folder directly. Add `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and the server-only `SUPABASE_SECRET_KEY` to the desired deployment environments. Deploy from Vercel or run `npx vercel --prod`.

Set the production URL as your Supabase Auth Site URL and add its `/auth/callback` URL to Redirect URLs. Also allow any exact preview callback URLs you use for signup testing.

## Checks

```sh
npm test
npm run typecheck
npm run build
```

The SQL access policies are covered by pgTAP tests for [applications](supabase/tests/applications_rls_test.sql) and [usernames](supabase/tests/account_usernames_test.sql).
