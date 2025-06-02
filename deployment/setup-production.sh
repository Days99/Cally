#!/bin/bash

# Cally Production Deployment Setup Script
# This script helps prepare your project for production deployment

echo "🚀 Cally Production Deployment Setup"
echo "===================================="

# Check if we're in the right directory
if [ ! -f "package.json" ] && [ ! -d "frontend" ] && [ ! -d "backend" ]; then
    echo "❌ Error: Please run this script from the root of your Cally project"
    exit 1
fi

echo "📁 Current directory: $(pwd)"
echo ""

# 1. Create production environment files
echo "📝 Step 1: Creating production environment files..."

# Backend environment
if [ ! -f "backend/.env.production" ]; then
    cp deployment/env.production.example backend/.env.production
    echo "✅ Created backend/.env.production (EDIT THIS FILE WITH YOUR VALUES)"
else
    echo "⚠️  backend/.env.production already exists"
fi

# Frontend environment
if [ ! -f "frontend/.env.production" ]; then
    cat > frontend/.env.production << EOF
REACT_APP_API_URL=https://your-backend-domain.onrender.com
REACT_APP_ENVIRONMENT=production
EOF
    echo "✅ Created frontend/.env.production (EDIT THIS FILE WITH YOUR VALUES)"
else
    echo "⚠️  frontend/.env.production already exists"
fi

echo ""

# 2. Check for required files
echo "🔍 Step 2: Checking for required files..."

required_files=(
    "backend/package.json"
    "frontend/package.json"
    "backend/src/index.js"
)

all_files_exist=true
for file in "${required_files[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file exists"
    else
        echo "❌ $file is missing"
        all_files_exist=false
    fi
done

echo ""

# 3. Install dependencies
echo "📦 Step 3: Installing dependencies..."

if [ -d "backend" ]; then
    echo "Installing backend dependencies..."
    cd backend && npm install
    cd ..
fi

if [ -d "frontend" ]; then
    echo "Installing frontend dependencies..."
    cd frontend && npm install
    cd ..
fi

echo ""

# 4. Test builds
echo "🔨 Step 4: Testing production builds..."

echo "Testing backend..."
cd backend
if npm run start --dry-run; then
    echo "✅ Backend build test passed"
else
    echo "❌ Backend build test failed"
fi
cd ..

echo "Testing frontend build..."
cd frontend
if npm run build; then
    echo "✅ Frontend build test passed"
    # Clean up build directory for now
    rm -rf build
else
    echo "❌ Frontend build test failed"
fi
cd ..

echo ""

# 5. Generate JWT secret
echo "🔐 Step 5: Generating JWT secret..."
jwt_secret=$(openssl rand -base64 32 2>/dev/null || python3 -c "import secrets; print(secrets.token_urlsafe(32))" 2>/dev/null || echo "PLEASE-GENERATE-A-SECURE-32-CHARACTER-SECRET")
echo "🔑 Generated JWT Secret: $jwt_secret"
echo "📝 Add this to your Render environment variables as JWT_SECRET"

echo ""

# 6. Summary and next steps
echo "✅ Setup Complete!"
echo "=================="
echo ""
echo "📋 Next Steps:"
echo "1. 📝 Edit backend/.env.production with your actual values"
echo "2. 📝 Edit frontend/.env.production with your backend URL"
echo "3. 🌐 Push your code to GitHub"
echo "4. 🖥️  Deploy backend to Render (see deployment/DEPLOYMENT_GUIDE.md)"
echo "5. 🌍 Deploy frontend to Vercel (see deployment/DEPLOYMENT_GUIDE.md)"
echo "6. 🔗 Configure your custom domain"
echo "7. 🔐 Set up OAuth applications"
echo ""
echo "📖 For detailed instructions, see: deployment/DEPLOYMENT_GUIDE.md"
echo ""
echo "🔑 JWT Secret: $jwt_secret"
echo "💾 Save this secret for your Render environment variables!"
echo ""
echo "Good luck with your deployment! 🚀" 