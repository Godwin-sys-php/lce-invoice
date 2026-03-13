 # Project Summary

## Overall Goal
Implement comprehensive invoice management features for "Le Consulat Express" including proforma invoices, per-item dates, and environment-based PDF URL configuration.

## Key Knowledge

### Technology Stack
- **Frontend**: React 19 + Vite 7 + Tailwind CSS 3.4
- **Backend**: Node.js + Express + MySQL2
- **PDF Generation**: PDFKit
- **Build**: Custom `build.sh` script for production deployment

### Environment Configuration
- **Development**: `frontend/.env` with `VITE_PDF_URL_PREFIX=http://localhost:3001/pdfs/`
- **Production**: `frontend/.env.production` with `VITE_PDF_URL_PREFIX=https://lce.corporus-software.com/pdfs/`
- Build script sets `NODE_ENV=production` before building

### Database Schema Changes (Migration 002_edit_features.sql)
```sql
ALTER TABLE invoice_items ADD COLUMN item_date DATE NULL;
ALTER TABLE invoices ADD COLUMN type ENUM('proforma', 'invoice') NOT NULL DEFAULT 'invoice';
```

### API Endpoints
- `POST /api/invoices` - Accepts `type` field ('invoice' or 'proforma')
- `PUT /api/invoices/:id` - Only allowed for proforma invoices
- `POST /api/invoices/:id/convert` - Converts proforma to definitive invoice

### Invoice Numbering
- **Regular invoices**: `CE-YYYY-XXXX` format
- **Proforma invoices**: `CE-PF-YYYY-XXXX` format

### PDF Changes
- Date column added between Description and Quantity
- Footer text: "MERCI DE VOTRE CONFIANCE" (was "MERCI POUR VOTRE ACHAT")
- Phone number added: `+243 810 001 904`
- Proforma label displayed prominently on proforma PDFs

## Recent Actions

1. **[DONE]** Set up Vite environment variable `VITE_PDF_URL_PREFIX` for PDF URL prefix configuration
2. **[DONE]** Updated `build.sh` to set `NODE_ENV=production` during build
3. **[DONE]** Created database migration `002_edit_features.sql` for `item_date` and `type` columns
4. **[DONE]** Updated backend `invoices.js` with:
   - POST endpoint accepting `type` parameter
   - PUT endpoint for editing proforma invoices only
   - POST `/convert` endpoint for converting proforma to invoice
   - Separate numbering logic for proforma vs invoice
5. **[DONE]** Updated `pdfGenerator.js` with:
   - Date column in PDF table
   - Updated footer text and phone number
   - Proforma label rendering
6. **[DONE]** Updated `InvoiceNew.jsx` with:
   - Facture/Proforma radio toggle (new invoices only)
   - Date picker for each line item
   - Edit mode support for proforma invoices
   - Grid layout adjusted for date column

## Current Plan

1. **[DONE]** Database schema updates
2. **[DONE]** Backend API updates (POST, PUT, convert endpoints)
3. **[DONE]** PDF generator updates
4. **[DONE]** InvoiceNew.jsx updates (toggle, date picker, edit mode)
5. **[IN PROGRESS]** Update `Invoices.jsx` list view:
   - Add type badges (Proforma in gray, Facture in black)
   - Add "Modifier" button for proforma invoices
   - Add "Convertir en facture" button for proforma invoices
   - Add confirmation dialog for conversion
6. **[TODO]** Test all changes end-to-end
7. **[TODO]** Run database migration on production

## Important Notes

- Proforma invoices are **mutable** - can be edited and regenerated
- Regular invoices are **immutable** - cannot be edited once created
- The `InvoiceNew.jsx` component already supports edit mode via URL param `/invoices/:id/edit`
- Date field is optional for each line item
- Phone number in PDF footer: `+243 810 001 904`

---

## Summary Metadata
**Update time**: 2026-03-12T17:10:03.322Z 
