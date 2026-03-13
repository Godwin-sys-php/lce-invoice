-- Add item_date column to invoice_items
ALTER TABLE invoice_items ADD COLUMN item_date DATE NULL;

-- Add type column to invoices (proforma or invoice)
ALTER TABLE invoices ADD COLUMN type ENUM('proforma', 'invoice') NOT NULL DEFAULT 'invoice';
