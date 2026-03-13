# Claude Code — Invoice Detail Modal & proforma History

---

## 1. Data model

Add a `proforma_history` table to track every version of a proforma before it becomes a definitive invoice:

```sql
CREATE TABLE IF NOT EXISTS proforma_history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  invoice_id INT NOT NULL REFERENCES invoices(id),
  pdf_path TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

Every time a proforma is **edited and regenerated**, save the old PDF path as a new row in `proforma_history` before overwriting it. This way all previous versions are preserved.

When a proforma is **converted to a definitive invoice**, also save its final proforma PDF as a history entry before the conversion.

---

## 2. API changes

- `GET /api/invoices/:id/history` — returns the full detail of an invoice plus:
  - `created_by_username` — name of the user who created it
  - `client` — client name and info
  - `items` — all line items
  - `proforma_history` — array of `{ id, pdf_url, created_at }` from the `proforma_history` table, only if the invoice was converted from a proforma (may be empty)

---

## 3. UI — "Voir détail" button on every invoice row

In the invoice list table, add a **"Voir détail"** button on every row (both proformas and definitive invoices).

Clicking it opens a modal containing:

**Header:**
- Invoice number + type badge (proforma / Facture)
- Client name
- Date created
- Created by (username)

**Line items:**
A clean table showing all items: date | description | qty | unit price | subtotal — plus the total at the bottom.

**proforma history section** (shown only if there are entries):
- Title: "Historique des versions proforma"
- A list of previous versions, each showing:
  - The date and time of that version
  - A "Voir PDF" link that opens the archived PDF in a new tab

**Current PDF:**
- A "Voir PDF" button for the current PDF at the bottom of the modal

The modal should be scrollable on mobile and close on outside click or Escape key.

---

## Notes

- PDF files for old proforma versions must be stored with unique filenames to avoid overwriting, e.g. `CE-PF-YYYY-XXXX_v1.pdf`, `CE-PF-YYYY-XXXX_v2.pdf` — use a timestamp or version counter in the filename
- The `pdfs/` static folder already serves files publicly, so all archived PDFs are accessible via their path the same way as current ones
