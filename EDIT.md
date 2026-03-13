# Claude Code — New Features

Add the following changes to the existing codebase.

---

## 1. Date field on each invoice line item

Add a `date` column to the `invoice_items` table:

```sql
ALTER TABLE invoice_items ADD COLUMN item_date DATE NULL;
```

Update the invoice creation form so each line item row has a date picker field, placed between the description column and the quantity column. The field is optional.

Display this date in the PDF table between the DESCRIPTION and QTÉ columns, formatted as DD/MM/YYYY. Adjust column widths accordingly.

---

## 2. PDF text changes

- Replace `"MERCI POUR VOTRE ACHAT"` with `"MERCI DE VOTRE CONFIANCE"` in the footer
- Add the phone number `+243 810 001 904` to the footer left block, on a new line just below the address

---

## 3. Proforma invoices

### Data model

Add a `type` column to the `invoices` table:

```sql
ALTER TABLE invoices ADD COLUMN type ENUM('proforma', 'invoice') NOT NULL DEFAULT 'invoice';
```

Proforma invoices are **mutable** — they can be edited and regenerated as many times as needed. Regular invoices remain immutable.

### API changes

- `POST /api/invoices` — accept a `type` field in the body (`'proforma'` or `'invoice'`, default `'invoice'`)
- `PUT /api/invoices/:id` — allowed **only** if `type = 'proforma'`. Updates the line items and regenerates the PDF.
- `POST /api/invoices/:id/convert` — converts a Proforma to a definitive invoice. Sets `type = 'invoice'`, the invoice becomes immutable from that point on. Assigns a new definitive invoice number `CE-YYYY-XXXX`.
- Proforma invoices use their own sequential numbering: `CE-PF-YYYY-XXXX`

### UI changes

In the invoice creation flow, add a toggle or radio at the top: **Facture** / **Proforma**

In the invoice list, show a badge on each row indicating the type ("Proforma" in gray, "Facture" in black).

Proforma rows have two additional action buttons:
- **Modifier** — opens the same creation form pre-filled with existing data, saves and regenerates the PDF on submit
- **Convertir en facture** — calls `POST /api/invoices/:id/convert`, asks for confirmation first

### PDF changes

On Proforma PDFs, add the label `"Proforma"` displayed prominently just below the invoice number in the top-right area. Style it as a large, light gray, uppercase label — clearly visible but not overpowering.

On definitive invoice PDFs, nothing changes.
