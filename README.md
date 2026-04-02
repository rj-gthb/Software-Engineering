# PinPoint Inventory Tracking

This repo now includes:

- A Vue 3 + Vite frontend
- A Node.js + Express backend
- A Supabase Postgres schema for users, parcels, reports, activity history, and admin settings

## Backend Features

- User registration and login with generated `userId` credentials
- Password reset secured by the organization security code
- Admin-only user management and security code rotation
- Parcel CRUD with filtering, pagination, and CSV export
- Reports/issues CRUD with unresolved tracking
- Activity history with CSV export
- Dashboard summary endpoint for monthly stats

## Run The Backend

1. Create a Supabase project.
2. Run the SQL in `server/supabase/schema.sql` inside the Supabase SQL editor.
3. Copy `server/.env.example` to `server/.env` and fill in your values.
4. Start the API:

```bash
npm run dev:server
```

The backend runs on `http://localhost:4000` by default and exposes its API under `/api`.

## Useful Scripts

- `npm run dev:client` starts the Vite frontend
- `npm run dev:server` starts the Express backend in watch mode
- `npm run build` builds the frontend
- `npm run start:server` runs the backend without watch mode

## Important Notes

- Use the Supabase `service_role` key only in the backend `server/.env`.
- The first registered user becomes the admin automatically.
- The first registration's security code seeds the shared organization security code.
- Later registrations and password resets must use that same security code unless an admin rotates it.
