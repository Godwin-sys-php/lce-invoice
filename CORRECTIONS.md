# Claude Code — Prompt de Correction

Apply the following fixes to the existing codebase. Do not rebuild from scratch — patch only what is described below.

---

## Fix 1 — App name: "Le Consulat Express" (not "Consulat Express")

Replace every occurrence of `"Consulat Express"` with `"Le Consulat Express"` across the entire codebase:
- All React components (sidebar, login page, layout header, page titles, etc.)
- PDF generation in the backend (`pdfkit` header, footer)
- README.md
- Any string in seed/migration files if it appears there

---

## Fix 2 — Serve PDFs as static files (no auth required)

Currently the PDF endpoint requires a JWT. Fix this so PDFs are publicly accessible as static files.

In `backend/index.js` (or wherever Express is configured), add a static middleware **before** any auth middleware:

```js
app.use('/pdfs', express.static(path.join(__dirname, 'pdfs')));
```

Remove or bypass the JWT check on `GET /api/invoices/:id/pdf`.

Update the `pdf_url` value stored/returned for each invoice to be a direct static URL like:
```
/pdfs/CE-2024-0001.pdf
```

In the frontend, when building the "Voir PDF" link, construct the full URL as:
```js
`${import.meta.env.VITE_API_URL}/pdfs/${invoice.invoice_number}.pdf`
```
or use a relative URL if the frontend proxies to the backend.

Make sure the `backend/pdfs/` directory is created automatically on startup if it doesn't exist (use `fs.mkdirSync(..., { recursive: true })`).

---

## Fix 3 — UI: Add border radius (rounder shapes)

The UI should feel clean and modern, not boxy. Apply these global style changes across all components:

- Buttons: `rounded-lg` (8px border-radius)
- Input fields, textareas, selects: `rounded-lg`
- Cards / modals / panels: `rounded-xl` (12px)
- Table container wrapper: `rounded-xl` with `overflow-hidden`
- Badges/tags if any: `rounded-full`
- Keep the black & white color palette unchanged — only add rounding

---

## Fix 4 — Full mobile responsiveness

Make the entire app properly responsive. Key changes:

### Layout
- On mobile (< `md` breakpoint), hide the sidebar and replace it with a **bottom navigation bar** with icons + labels for: Factures | Produits | Clients
- On desktop, keep the left sidebar as-is
- Top bar should collapse gracefully on mobile (just show app name + logout icon)

### Tables → Cards on mobile
- All tables (invoices, products, clients) should switch to a **card list layout on mobile** (`block md:hidden` for cards, `hidden md:block` for table)
- Each card shows the key fields stacked vertically

### Invoice Creation Form
- Stack all form elements vertically on mobile
- Line item rows should stack (product on top, then qty + price side by side, then total)
- Modals should be full-screen bottom sheets on mobile (`fixed bottom-0 left-0 right-0 rounded-t-2xl` with a drag handle bar at top)

### General
- Use `px-4` padding on mobile, `px-6` or `px-8` on desktop
- Ensure tap targets are at least 44px tall (buttons, inputs)
- Font sizes should be legible on small screens (`text-sm` minimum for body)

---

## Fix 5 — Searchable select dropdowns (mobile-friendly)

Replace the current custom searchable text inputs for client and product selection with **native `<select>` elements enhanced with a search filter**.

Implement a reusable `SearchableSelect` component:

```
Props: { options: [{ value, label }], value, onChange, placeholder, onCreate? }
```

Behavior:
- Renders a styled container that shows the selected option or placeholder
- On click/tap → opens a **dropdown panel** (or bottom sheet on mobile) containing:
  - A text `<input>` at the top for filtering
  - A scrollable list of matching options (rendered as styled `<button>` or `<div>` elements)
  - If `onCreate` prop is provided, show a "+ Créer: [search text]" option at the bottom when no exact match found
- On option select → closes the panel and calls `onChange`
- On outside click → closes the panel
- Fully keyboard accessible (arrow keys, Enter, Escape)
- Styled in the black & white design system with `rounded-xl` panel, subtle shadow

Use this `SearchableSelect` component:
1. **Client selector** in invoice creation — options are all clients by name
2. **Product selector** in each line item row — options are all products by name (show price next to name if available, e.g. "Consultation — $150.00" or "Consultation — prix libre")

The user should be able to scroll through all options without typing anything, and optionally type to filter — no need to remember exact names.

