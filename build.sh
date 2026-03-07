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

# Install dependencies
echo "📦 Installing dependencies..."
bun install

# Build frontend
echo "🔨 Building frontend..."
bun run build:frontend
echo "✅ Frontend built successfully in dist/static/"
echo ""

# Build backend
echo "🔨 Building backend..."
bun run build:backend

# Make executable
chmod +x dist/lan-share

# Clean up
rm -rf node_modules frontend/node_modules backend/node_modules
rm -f bun.lock

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
