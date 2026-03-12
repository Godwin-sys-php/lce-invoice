#!/bin/bash

# Build script for Le Consulat Express
# Builds the frontend and copies it to backend/dist for production

set -e

echo "🚀 Building Le Consulat Express for production..."

# Build frontend
echo "📦 Building frontend..."
cd frontend
npm install
NODE_ENV=production npm run build
cd ..

# Copy frontend dist to backend
echo "📂 Copying frontend build to backend/dist..."
rm -rf backend/dist
cp -r frontend/dist backend/dist

echo "✅ Build complete!"
echo ""
echo "To start production server:"
echo "  cd backend"
echo "  NODE_ENV=production npm start"
