# Claude Code Prompt — Consulat Express Invoice App

---

Build a full-stack invoice generation web application called **"Consulat Express"**.

## Project Structure

Create two top-level folders:
- `backend/` — Express.js REST API
- `frontend/` — React SPA

---

## BACKEND (`backend/`)

### Stack
- Node.js + Express
- SQLite (via `better-sqlite3`)
- JWT authentication (`jsonwebtoken`)
- Password hashing (`bcryptjs`)
- PDF generation (`pdfkit`)
- `cors`, `dotenv`

### Database — write a single migration file `backend/migrations/001_initial.sql`

```sql
-- Users (admin only, created manually via seed script)
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Products
CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  price REAL NULL, -- NULL means "price to be defined at invoice time"
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Clients
CREATE TABLE IF NOT EXISTS clients (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  phone TEXT NULL,
  birthday DATE NULL,
  notes TEXT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Invoices
CREATE TABLE IF NOT EXISTS invoices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  invoice_number TEXT NOT NULL UNIQUE, -- e.g. "CE-2024-0001"
  client_id INTEGER NOT NULL REFERENCES clients(id),
  created_by INTEGER NOT NULL REFERENCES users(id),
  pdf_path TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Invoice line items
CREATE TABLE IF NOT EXISTS invoice_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  invoice_id INTEGER NOT NULL REFERENCES invoices(id),
  product_id INTEGER NOT NULL REFERENCES products(id),
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price REAL NOT NULL -- always stored explicitly in USD
);
```

Also create `backend/seed.js` — a script to create the first admin user:
```
node seed.js --username admin --password <password>
```
It should hash the password with bcrypt and insert the user into the DB.

Also create `backend/migrate.js` — a script that reads and executes `migrations/001_initial.sql`.

### REST API Routes

All routes except `POST /api/auth/login` require a valid JWT (`Authorization: Bearer <token>`).

#### Auth
- `POST /api/auth/login` → `{ username, password }` → returns `{ token, user: { id, username } }`
- `GET /api/auth/me` → returns current user info

#### Products
- `GET /api/products` → list all products
- `POST /api/products` → create product `{ name, price? }` (price can be null)
- `PUT /api/products/:id` → update product
- `DELETE /api/products/:id` → delete product (only if not used in any invoice)
- `GET /api/products/:id/last-price` → returns the last `unit_price` used for this product across all invoices

#### Clients
- `GET /api/clients` → list all clients
- `POST /api/clients` → create `{ name, phone?, birthday?, notes? }`
- `PUT /api/clients/:id` → update client
- `DELETE /api/clients/:id` → delete client (only if not used in any invoice)

#### Invoices
- `GET /api/invoices` → list all invoices with: invoice_number, client name, creator username, item count, pdf_url, created_at
- `GET /api/invoices/:id` → full invoice details with all line items
- `POST /api/invoices` → create + immediately generate PDF → returns the created invoice
  - Body: `{ client_id, items: [{ product_id, quantity, unit_price }] }`
  - **Invoices are immutable once created — no PUT or DELETE route**
- `GET /api/invoices/:id/pdf` → serve the PDF file

### PDF Generation

Use `pdfkit` to generate an **A4 PDF** for each invoice with:
- Header: **"CONSULAT EXPRESS"** in bold, large font, top center
- Invoice number, date, "Créé par: [username]"
- Client name and info block
- Line items table: Product name | Qty | Unit Price (USD) | Total
- **Subtotal** and **TOTAL** in USD
- Footer: "Consulat Express — Thank you for your business"
- The layout must **adapt font size and row spacing** based on the number of items (max ~4 lines expected, but handle gracefully up to ~15)
- Save PDF to `backend/pdfs/[invoice_number].pdf`
- Black and white only, clean and professional

---

## FRONTEND (`frontend/`)

### Stack
- React (Vite)
- React Router v6
- Tailwind CSS
- Axios (for API calls)
- `react-hot-toast` for notifications

### Design System — Black & White, Clean, Professional
- Background: white `#ffffff`
- Primary text: near-black `#111111`
- Borders: `#e5e5e5`
- Buttons: black background, white text; hover → `#333`
- Inputs: white bg, black border on focus
- No colors, no gradients — minimal and premium
- Font: Inter (import from Google Fonts)
- Cards with subtle `box-shadow: 0 1px 3px rgba(0,0,0,0.08)`

### Pages & Components

#### `/login`
- Centered card with "CONSULAT EXPRESS" title
- Username + Password fields
- Login button
- No sign up, no forgot password
- JWT stored in `localStorage`
- On success → redirect to `/invoices`

#### Authenticated Layout
- Left sidebar: logo/app name at top, nav links: **Factures** | **Produits** | **Clients**
- Top bar: username + logout button

#### `/invoices` — Invoice List
- Table: Invoice # | Client | Created by | Items | Date | PDF
- Each row: "Voir PDF" button (opens PDF in new tab)
- "Nouvelle Facture" CTA button top-right
- Invoices are immutable — no edit, no delete

#### `/invoices/new` — Invoice Creation
**Step 1 — Select or Create Client**
- Searchable dropdown of existing clients
- "Nouveau client" button → opens modal with fields: `name` (required), `phone`, `birthday`, `notes` → saves and auto-selects

**Step 2 — Add Line Items**
- Each row:
  - Searchable product dropdown
  - "+ Nouveau produit" button → opens mini modal: `name` (required), `price` (optional, null = "prix à définir") → saves and auto-selects
  - Quantity field (default 1)
  - Unit Price field (USD):
    - Fixed-price product → pre-fill with product price
    - Null-price product → pre-fill with last used price from `GET /api/products/:id/last-price` (empty if never used)
    - Always manually editable
  - Line total (qty × price, read-only, formatted as $X,XXX.XX)
  - Remove row button (×)
- "Ajouter un produit" button
- Running **TOTAL** shown at bottom right in large text
- "Générer la Facture" button → POST /api/invoices → success toast → redirect to /invoices
- Cancel / Back button

#### `/products` — Products Page
- Table: Name | Price (or "Prix à définir") | Actions (edit, delete)
- "Nouveau Produit" button → inline modal
- Delete disabled with tooltip if product used in invoices

#### `/clients` — Clients Page
- Table: Name | Phone | Birthday | Notes | Actions
- "Nouveau Client" button → inline modal
- Delete disabled with tooltip if client has invoices

### Auth
- `PrivateRoute` wrapper → redirect to `/login` if no JWT
- Axios interceptor → attach `Authorization: Bearer <token>`
- On 401 → clear token + redirect to `/login`

---

## General Requirements

- Prices always in **USD**, formatted as `$X,XXX.XX`
- Invoice numbers auto-generated as `CE-YYYY-XXXX` (sequential, padded to 4 digits)
- Dates displayed as `DD/MM/YYYY`
- Include a root `README.md`:
  1. Install: `cd backend && npm install` / `cd frontend && npm install`
  2. Migrate: `cd backend && node migrate.js`
  3. Seed admin: `cd backend && node seed.js --username admin --password yourpassword`
  4. Run backend: `cd backend && npm run dev` (port 3001)
  5. Run frontend: `cd frontend && npm run dev` (port 5173)
  6. Environment variables (create `backend/.env` from `.env.example`): `JWT_SECRET`, `PORT=3001`, `DB_PATH=./database.db`
- Add `.gitignore` at root: `node_modules`, `.env`, `backend/pdfs/`, `*.db`
- `backend/.env.example` with all required vars

