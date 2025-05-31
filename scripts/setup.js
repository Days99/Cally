const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚀 Cally Setup Script');
console.log('====================\n');

// Check if .env files exist
const backendEnvPath = path.join(__dirname, '../backend/.env');
const frontendEnvPath = path.join(__dirname, '../frontend/.env');

console.log('📋 Checking environment files...');

if (!fs.existsSync(backendEnvPath)) {
  console.log('❌ Backend .env file not found');
  console.log('💡 Please copy backend/env.example to backend/.env and configure your database settings');
  process.exit(1);
} else {
  console.log('✅ Backend .env file found');
}

if (!fs.existsSync(frontendEnvPath)) {
  console.log('❌ Frontend .env file not found');
  console.log('💡 Please copy frontend/env.example to frontend/.env');
  process.exit(1);
} else {
  console.log('✅ Frontend .env file found');
}

console.log('\n📦 Checking dependencies...');

// Check if node_modules exist
const backendNodeModules = path.join(__dirname, '../backend/node_modules');
const frontendNodeModules = path.join(__dirname, '../frontend/node_modules');

if (!fs.existsSync(backendNodeModules)) {
  console.log('❌ Backend dependencies not installed');
  console.log('💡 Run: cd backend && npm install');
  process.exit(1);
} else {
  console.log('✅ Backend dependencies installed');
}

if (!fs.existsSync(frontendNodeModules)) {
  console.log('❌ Frontend dependencies not installed');
  console.log('💡 Run: cd frontend && npm install');
  process.exit(1);
} else {
  console.log('✅ Frontend dependencies installed');
}

console.log('\n🗄️  Database Setup');
console.log('==================');
console.log('Before running the migration, ensure:');
console.log('1. PostgreSQL is installed and running');
console.log('2. Database "cally" is created');
console.log('3. Database credentials are configured in backend/.env');
console.log('\nTo create the database, run:');
console.log('psql -U postgres -c "CREATE DATABASE cally;"');
console.log('\nThen run the migration:');
console.log('npm run migrate');

console.log('\n🎯 Next Steps');
console.log('=============');
console.log('1. Configure your database in backend/.env');
console.log('2. Run: npm run migrate (from backend directory)');
console.log('3. Start backend: npm run dev (from backend directory)');
console.log('4. Start frontend: npm start (from frontend directory)');
console.log('5. Visit: http://localhost:3000');

console.log('\n📚 Documentation');
console.log('================');
console.log('- Database setup: docs/database-setup.md');
console.log('- Project README: README.md');

console.log('\n✨ Setup check completed!'); 