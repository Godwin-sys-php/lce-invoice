# Le Consulat Express — Invoice App

A full-stack invoice generation web application.

## Setup

### 1. Install dependencies

```bash
cd backend && npm install
cd ../frontend && npm install
```

### 2. Configure environment

```bash
cp backend/.env.example backend/.env
# Edit backend/.env and set your JWT_SECRET and database credentials
```

### 3. Run database migration

```bash
cd backend && node migrate.js
```

### 4. Seed admin user

```bash
cd backend && node seed.js --username admin --password yourpassword
```

### 5. Start backend (port 3001)

```bash
cd backend && npm run dev
```

### 6. Start frontend (port 5173)

```bash
cd frontend && npm run dev
```

## Environment Variables

| Variable     | Description              | Default          |
|-------------|--------------------------|------------------|
| `JWT_SECRET` | Secret key for JWT tokens | *(required)*     |
| `PORT`       | Backend server port       | `3001`           |
| `DB_HOST`    | MySQL host                | `localhost`      |
| `DB_PORT`    | MySQL port                | `3306`           |
| `DB_USER`    | MySQL username            | `root`           |
| `DB_PASSWORD`| MySQL password            | *(required)*     |
| `DB_NAME`    | MySQL database name       | `consulat_express`|

---

## Production

### Prerequisites

- MySQL server running
- Database `consulat_express` created
- Environment variables configured in `backend/.env`

### Build

From the project root:

```bash
./build.sh
```

This will:
1. Build the frontend
2. Copy `frontend/dist/` to `backend/dist/`

### Start Production Server

```bash
cd backend
NODE_ENV=production npm start
```

The backend will serve both the API and the built frontend on the configured port (default: 3001).

### Database Setup (First Time)

Run the migration SQL against your MySQL server:

```bash
mysql -u root -p consulat_express < backend/migrations/001_initial.sql
```

Then seed the admin user:

```bash
cd backend && node seed.js --username admin --password yourpassword
```

### Production Features

- Single server serves both API and frontend
- Static files served from `backend/dist/`
- React Router handled via catch-all route
- CORS disabled (same-origin requests only)
