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
const isProduction = process.env.NODE_ENV === 'production';

// Ensure pdfs directory exists
const pdfsDir = path.join(__dirname, '..', 'pdfs');
if (!fs.existsSync(pdfsDir)) {
  fs.mkdirSync(pdfsDir, { recursive: true });
}

// CORS only needed in development
if (!isProduction) {
  app.use(cors());
}

app.use(express.json());

// Static PDF files (public, no auth required)
app.use('/pdfs', express.static(pdfsDir));

// Public routes
app.use('/api/auth', authRoutes);

// Protected routes
app.use('/api/products', authMiddleware, productRoutes);
app.use('/api/clients', authMiddleware, clientRoutes);
app.use('/api/invoices', authMiddleware, invoiceRoutes);

// Production: serve static frontend files
if (isProduction) {
  const distPath = path.join(__dirname, '..', 'dist');
  app.use(express.static(distPath));
  
  // Catch-all route for React Router
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Le Consulat Express API running on port ${PORT} (${isProduction ? 'production' : 'development'})`);
});
