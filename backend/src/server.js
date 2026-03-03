const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const express = require('express');
const cors = require('cors');
const authMiddleware = require('./middleware/auth');

const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const clientRoutes = require('./routes/clients');
const invoiceRoutes = require('./routes/invoices');

const app = express();
const PORT = process.env.PORT || 3001;

// Ensure pdfs directory exists
const pdfsDir = path.join(__dirname, '..', 'pdfs');
if (!fs.existsSync(pdfsDir)) {
  fs.mkdirSync(pdfsDir, { recursive: true });
}

app.use(cors());
app.use(express.json());

// Static PDF files (public, no auth required)
app.use('/pdfs', express.static(pdfsDir));

// Public routes
app.use('/api/auth', authRoutes);

// Protected routes
app.use('/api/products', authMiddleware, productRoutes);
app.use('/api/clients', authMiddleware, clientRoutes);
app.use('/api/invoices', authMiddleware, invoiceRoutes);

app.listen(PORT, () => {
  console.log(`Le Consulat Express API running on port ${PORT}`);
});
