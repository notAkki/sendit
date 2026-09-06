# Sendit

Sendit is a private, multi-currency expense splitter for trips with friends. A room code is the shared secret: friends can join on any device, claim an existing participant, add people who never open the app, and settle the final balances with a minimal set of transfers.

## What is included

- Anonymous, cookie-backed Supabase identities and membership-scoped RLS
- Room creation, join codes, invite links, throttled joins, and creator-controlled code rotation
- Add participants at any time; claim, rename, or archive them without losing history
- Member-owned preferred currencies and private in-room payment instructions
- Equal, exact, percentage, and weighted expense splits with deterministic currency rounding
- Historical and current exchange rates from [Frankfurter v2](https://frankfurter.dev/)
- Precise decimal accounting with permanently locked rate snapshots
- Private JPEG, PNG, WebP, and PDF receipts up to 10 MB, with large-image compression
- Searchable expense ledger with payer, beneficiary, currency, and date filters
- Gross and net balance views, recorded person-to-person payments, and optimized settlement suggestions
- Exact minimum-transfer search for up to 12 non-zero balances and a deterministic fallback for larger rooms
- System-aware light/dark mode and one private Realtime room channel

Sendit records obligations and repayments; it does not move money.

## Local setup

1. Install dependencies.

   ```bash
   npm install
   ```

2. Create a Supabase project. In **Authentication → Providers → Anonymous Sign-Ins**, enable anonymous users.

3. Apply [`supabase/migrations/20260901000000_sendit.sql`](./supabase/migrations/20260901000000_sendit.sql) to a new Supabase project. You can paste it into the Supabase SQL editor, or link the Supabase CLI and run:

   ```bash
   supabase db push
   ```

   The migration creates the schema, transactional RPCs, RLS policies, private receipt bucket, join throttling, and membership-authorized Realtime broadcasts.

4. Copy the environment template.

   ```bash
   cp .env.example .env.local
   ```

   Fill in the Project URL and publishable key from the Supabase **Connect** dialog:

   ```dotenv
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_your_key
   ```

   Do not use a Supabase secret or service-role key in these variables.

5. Start Sendit.

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

Frankfurter does not require an API key. Internet access is only needed when Sendit fetches a non-base exchange rate.

## Useful commands

```bash
npm run dev
npm run lint
npm run build
npm start
```

## Privacy model

A room code is intentionally the shared secret for this friends-only tool. Database reads are restricted to anonymous identities that joined that room. Financial mutations go through membership-checking database functions, receipts live in a private bucket, and private Realtime channel access is checked against room membership.

Rotate the room code from **People → Creator settings** if an invite is shared accidentally. Rotation invalidates old invite links but keeps existing joined devices connected.

## Troubleshooting an existing database

If you applied the original migration before September 5, 2026 and room creation reports `record "new" has no field "room_id"`, paste [`supabase/migrations/20260905000000_fix_room_broadcast_trigger.sql`](./supabase/migrations/20260905000000_fix_room_broadcast_trigger.sql) into the Supabase SQL editor and run it once. No reset or seed step is required.

For an existing Sendit database, paste [`supabase/migrations/20260905010000_member_payment_details.sql`](./supabase/migrations/20260905010000_member_payment_details.sql) into the SQL editor once to add member payment details and remove the old merge function.
