# Claude Code — Update PDF Invoice Design

Update the PDF generation with the following changes. Do not rebuild from scratch — patch the existing PDF generation code.

---

## Change 1 — Logo image above company name

At the very top of the page (before the header text), render the logo:

```js
const logoPath = path.join(__dirname, 'logo.png');
if (fs.existsSync(logoPath)) {
  doc.image(logoPath, 50, 45, { width: 80 }); // left-aligned, adjust Y so it sits above the company name
}
```

The company name `"Le Consulat Express."` should appear just below the logo, still on the left side.
Adjust vertical spacing so the header doesn't overlap — push the company name down by the logo height + 10pt gap.

---

## Change 2 — Keep CE- prefix in invoice number

Display the full invoice number including prefix in the top-right header:
- Text: `"No. CE-YYYY-XXXX"` (keep full invoice_number value as stored)
- Font: Helvetica, size 28, color `#888888`, right-aligned

---

## Change 3 — Remove "Créé par"

Remove the `"Créé par: [username]"` line entirely from the PDF.
The only date shown in the top-right info block is the issue date.

---

## Change 4 — Everything in French

Replace all English labels in the PDF with French equivalents:

| Old (English) | New (French) |
|---|---|
| `ISSUED TO:` | `FACTURÉ À :` |
| `Issue Date:` | `Date :` |
| `DESCRIPTION` | `DESCRIPTION` |
| `PRICE` | `PRIX UNIT.` |
| `QTY` | `QTÉ` |
| `SUBTOTAL` | `SOUS-TOTAL` |
| `TOTAL` | `TOTAL` |
| `QUESTIONS?` | `CONTACT` |

---

## Change 5 — Bold, blocky, well-filled layout

Make the invoice feel substantial and well-structured:

- **Company name**: Helvetica-Bold, size **36**, color `#111111` (bigger than before)
- **Invoice number**: Helvetica, size **28**, color `#888888`
- **Table rows**: minimum height **38pt**, font size **11** for data, **10** for headers
- **Minimum rows rendered**: always render at least **8 rows** (fill empty ones with blank lines) so the table fills the page nicely
- **TOTAL row**: font size **13**, bold, with a top border of 1.5pt `#111111`
- **Section spacing**: increase gap between sections (header → client block → table → footer) to breathe but feel substantial

---

## Change 6 — Updated footer

Replace the footer content entirely with:

**Left block:**
- Line 1: `"LE CONSULAT EXPRESS"` — Helvetica-Bold, size 9, `#111111`
- Line 2: `"326. AV HAUT-COMMANDEMENT REF,"` — Helvetica, size 8, `#555555`
- Line 3: `"CROISEMENT AVEC L'AVENUE LES PALMIERS"` — Helvetica, size 8, `#555555`
- Line 4: `"GOMBE / KINSHASA / RDC"` — Helvetica, size 8, `#555555`

**Right block (right-aligned):**
- Line 1: `"MERCI POUR VOTRE ACHAT"` — Helvetica-Bold, size 10, `#111111`

Separate the footer from the table with a horizontal line (`#CCCCCC`, 0.5pt) ~60pt from the bottom of the page.

---

## Notes

- Make sure `fs` and `path` are imported in the PDF generation file
- If `logo.png` does not exist, skip the image silently (no crash)
- All monetary values stay formatted as `$X,XXX.XX`
- PDF background stays `#F2F2F2`
