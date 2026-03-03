# Claude Code — Production Setup

Prepare the application for production deployment. Three things to do.

---

## 1. Switch from SQLite to MySQL (package `mysql2`)

Replace `better-sqlite3` with `mysql2` throughout the entire backend.

Create a file `backend/migrations/001_initial.sql` containing only the `CREATE TABLE IF NOT EXISTS` statements for all tables (users, products, clients, invoices, invoice_items). This file should be runnable directly against a fresh MySQL server.

Update all database access code to use `mysql2` in promise mode (`mysql2/promise`). The connection must read its config from environment variables: `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`.

Update `backend/.env.example` with these new variables.

---

## 2. Unified production build

At the project root, create a `build.sh` script (and a `"build"` entry in the root `package.json` if needed) that:

1. Goes into `frontend/` and runs `npm run build`
2. Copies the contents of `frontend/dist/` into `backend/dist/`

Then in the backend, add:
- A middleware that serves static files from `backend/dist/`
- A catch-all route at the very end (after all `/api` routes) that serves `backend/dist/index.html` so React Router works correctly
- All of this only when `NODE_ENV=production`

---

## 3. Dynamic API URL in the frontend

All Axios requests in the frontend should point to `/api` in production and `http://localhost:3001/api` in development.

Set this up via a Vite environment variable:
- `frontend/.env` → `VITE_API_URL=http://localhost:3001`
- `frontend/.env.production` → `VITE_API_URL=` (empty, so the URL is relative)

In the Axios config, use:
```
baseURL: import.meta.env.VITE_API_URL + '/api'
```

In production, all requests will go to `/api/...` on the same server with no code changes needed.

---

## Notes

- `build.sh` must be executable (`chmod +x`)
- Update `README.md` with a **Production** section explaining how to build and start
- In production, the backend runs alone on its port and serves both the API and the built frontend
