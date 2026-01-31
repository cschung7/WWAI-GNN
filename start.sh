#!/bin/bash
# WWAI-GNN Startup Script
# Starts both the FastAPI backend and Next.js frontend

set -e

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR"

echo "=========================================="
echo "🚀 WWAI-GNN Economic Forecasting System"
echo "=========================================="

# Check Python environment
if ! command -v python3 &> /dev/null; then
    echo "❌ Python3 not found"
    exit 1
fi

# Check Node.js environment
if ! command -v npm &> /dev/null; then
    echo "❌ Node.js/npm not found"
    exit 1
fi

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Shutting down..."
    kill $BACKEND_PID 2>/dev/null || true
    kill $FRONTEND_PID 2>/dev/null || true
    exit 0
}

trap cleanup SIGINT SIGTERM

# Start Backend
echo ""
echo "📊 Starting FastAPI Backend (port 8005)..."
cd "$PROJECT_DIR"
PYTHONPATH="$PROJECT_DIR" python3 -m uvicorn api.main:app --host 0.0.0.0 --port 8005 --reload &
BACKEND_PID=$!
echo "   Backend PID: $BACKEND_PID"

# Wait for backend to be ready
echo "   Waiting for backend..."
sleep 3

# Check if backend is running
if curl -s http://localhost:8005/health > /dev/null 2>&1; then
    echo "   ✅ Backend ready!"
else
    echo "   ⚠️  Backend may still be starting..."
fi

# Start Frontend
echo ""
echo "🎨 Starting Next.js Frontend (port 3789)..."
cd "$PROJECT_DIR/frontend"
npm run dev -- -p 3789 &
FRONTEND_PID=$!
echo "   Frontend PID: $FRONTEND_PID"

# Wait for frontend
sleep 5

echo ""
echo "=========================================="
echo "✅ WWAI-GNN System Ready!"
echo "=========================================="
echo ""
echo "🌐 Frontend:  http://localhost:3789"
echo "📡 API:       http://localhost:8005"
echo "📚 API Docs:  http://localhost:8005/api/docs"
echo ""
echo "Press Ctrl+C to stop all services"
echo ""

# Wait for both processes
wait $BACKEND_PID $FRONTEND_PID
