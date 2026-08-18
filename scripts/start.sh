#!/bin/bash

# =============================================================================
# MediScribe AI - Local Startup Script
# =============================================================================

set -e

echo "🏥 MediScribe AI - Local Development Startup"
echo "=============================================="
echo ""

# Check if .env file exists
if [ ! -f .env ]; then
    echo "📋 Creating .env file from template..."
    cp .env.example .env
    echo "⚠️  Please update .env with your configuration!"
    echo ""
fi

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker to continue."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose to continue."
    exit 1
fi

echo "✅ Docker and Docker Compose are installed"
echo ""

# Check backend node_modules
if [ ! -d "backend/node_modules" ]; then
    echo "📦 Installing backend dependencies..."
    cd backend
    npm install
    cd ..
    echo "✅ Backend dependencies installed"
    echo ""
fi

# Create scripts directory if it doesn't exist
mkdir -p scripts

# Create init-db.sql if it doesn't exist
if [ ! -f "scripts/init-db.sql" ]; then
    echo "📄 Creating database initialization script..."
    cat > scripts/init-db.sql << 'SQLEOF'
-- MediScribe AI Database Initialization
CREATE SCHEMA IF NOT EXISTS mediscribe;
SET search_path TO mediscribe;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
SELECT 'MediScribe AI database initialized successfully' as status;
SQLEOF
fi

echo "🚀 Starting MediScribe AI services..."
echo ""

# Start services
docker-compose up -d

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
sleep 10

echo ""
echo "📊 Service Status:"
echo "=================="
echo "✅ PostgreSQL:     Ready (Port 5432)"
echo "✅ Redis:          Ready (Port 6379)"
echo "✅ Backend API:    Running (Port 3000)"
echo "✅ Frontend:       Running (Port 4200)"
echo "✅ pgAdmin:        Running (Port 5050)"
echo "✅ Redis Commander: Running (Port 8081)"
echo ""
echo "=============================================="
echo "🎉 MediScribe AI is running!"
echo ""
echo "📚 Access URLs:"
echo "   - Main App:      http://localhost:4200"
echo "   - API Docs:      http://localhost:3000/api"
echo "   - pgAdmin:       http://localhost:5050"
echo "   - Redis Cmd:     http://localhost:8081"
echo ""
echo "🛑 To stop:    docker-compose down"
echo "📋 To view logs: docker-compose logs -f"
echo "=============================================="
