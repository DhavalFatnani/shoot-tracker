# ShootTrack

Production-grade, role-based, event-sourced serialized shoot inventory movement system.

## Stack

- Next.js 15 (App Router), React 19, TypeScript (strict)
- Supabase (Postgres 16+), Drizzle ORM
- Zod, Tailwind v4, ShadCN-ready
- Vitest, Playwright

## Getting Started

1. **Environment**: Copy `.env.example` to `.env` and set `DATABASE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, etc.

2. **Schema reset** (optional, destructive): To drop all ShootTrack tables and recreate from scratch, run the SQL in `scripts/reset-shoottrack-schema.sql` against your Supabase DB, then run migrations.

3. **Migrations**: `npm run db:push` or `npm run db:migrate` to apply the Drizzle schema and RLS/trigger migrations.

4. **Supabase Storage**: For dispute resolution photos, create the `dispute-photos` bucket in the Supabase Dashboard (Storage → New bucket). See [docs/SUPABASE-STORAGE.md](docs/SUPABASE-STORAGE.md).

5. **Development server**:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000). Sign up/sign in with Supabase Auth; profile and role are created via DB trigger or on first load.

6. **Tests**: `npm run test:run` (Vitest unit). `npm run test:e2e` (Playwright; starts dev server).

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
