#!/bin/bash

# LAN Share - Build script
# Creates a standalone executable for the application

set -e

echo "🚀 LAN Share - Building standalone executable"
echo ""

# Check if Bun is installed
if ! command -v bun &> /dev/null; then
    echo "❌ Bun is not installed. Please install it first: https://bun.sh/"
    exit 1
fi

# Create dist directory
echo "📁 Creating dist directory..."
mkdir -p dist

# Build frontend
echo "🔨 Building frontend..."
cd frontend

if [ ! -d "node_modules" ]; then
    echo "📦 Installing frontend dependencies..."
    bun install
fi

echo "📦 Building frontend assets..."
bun run build

cd ..
echo "✅ Frontend built successfully in dist/static/"
echo ""

# Build backend
echo "🔨 Building backend..."
cd backend

if [ ! -d "node_modules" ]; then
    echo "📦 Installing backend dependencies..."
    bun install
fi

echo "📦 Creating standalone executable..."
# Build standalone executable in the root dist directory
bun build --compile src/index.ts --outfile ../dist/lan-share

# Make executable
chmod +x ../dist/lan-share

cd ..
# Clean up
rm -rf backend/node_modules frontend/node_modules
rm backend/bun.lock frontend/bun.lock

echo "✅ Backend standalone executable created at dist/lan-share"
echo ""

echo "🎉 Build completed successfully!"
echo ""
echo "Distribution ready in dist/:"
echo "  - Executable: dist/lan-share"
echo "  - Frontend assets: dist/static/"
echo ""
echo "To run the application:"
echo "  ./start.sh"
