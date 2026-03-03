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
# Edit backend/.env and set your JWT_SECRET
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
| `DB_PATH`    | Path to SQLite database   | `./database.db`  |
