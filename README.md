# Vertex POS

Vertex POS is a production-minded POS platform starter rebuilt from the original project into a cleaner Next.js + Prisma + PostgreSQL + Auth.js architecture.

This version keeps the spirit of the original POS project while replacing the brittle auth/data flow, cleaning the route structure, and adding a stronger business foundation for products, categories, checkout, inventory movement, suppliers, purchases, reporting, notifications, and worker processing.

## What is included

- Credentials authentication with Auth.js
- Prisma + PostgreSQL schema
- Shop onboarding flow
- Protected app shell
- Dashboard with KPIs and low-stock notifications
- Product and category management
- Checkout flow that creates sales and deducts stock
- Sales history
- Supplier module
- Stock-in / purchase entry flow
- Settings page for tax, currency, and receipt footer
- Worker job foundation for low-stock scans and daily summary generation
- Improved README and install flow

## Core modules

### Auth and shop foundation
- `/signup`
- `/login`
- `/onboard`

### POS app
- `/dashboard`
- `/products`
- `/checkout`
- `/sales`
- `/suppliers`
- `/purchases`
- `/reports`
- `/settings`

### Worker
- `worker/index.ts`
- database-backed `WorkerJob`
- low-stock alert scan
- daily summary scan

## Tech stack

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS
- Prisma ORM
- PostgreSQL
- Auth.js
- Zod
- bcryptjs

## Install

```bash
npm install
cp .env.example .env
```

Update `.env` with your PostgreSQL connection.

Generate and migrate:

```bash
npx prisma generate
npx prisma migrate dev --name init_vertex_pos
```

Optional demo seed:

```bash
npm run seed
```

Run the app:

```bash
npm run dev
```

Run the worker in another terminal:

```bash
npm run worker
```

## Environment variables

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/vertex_pos?schema=public"
AUTH_SECRET="replace-with-a-long-random-secret"
AUTH_TRUST_HOST="true"
```

## Architecture summary

### App layer
- App Router pages under `app/`
- Route groups for auth pages and protected POS pages
- API routes under `app/api/`

### Data layer
- Prisma schema models for:
  - users
  - shops
  - memberships
  - categories
  - products
  - sales and sale items
  - suppliers
  - purchase orders and purchase items
  - notifications
  - activity logs
  - settings
  - worker jobs

### Worker layer
The worker is database-backed so you can run it without Redis first.
It polls queued jobs and currently handles:

- low stock scan jobs
- daily summary jobs

You can later swap this to BullMQ or another queue without changing the app workflows much.

## Suggested next upgrades

- barcode camera scanning
- printable thermal receipt layout improvements
- cashier shift open/close flow
- refunds and void workflow
- RBAC management UI
- customer records and loyalty
- multi-branch support
- offline sync queue

## Attribution

Original inspiration:
- Raymart-Leyson / pos-system

This repository is an independently rebuilt and upgraded version in your own repo with substantial architecture changes and new implementation decisions.
