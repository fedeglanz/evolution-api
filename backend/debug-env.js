// Debug environment variables
require('dotenv').config();

console.log('🔍 Environment Variables Debug:');
console.log('FRONTEND_URL:', process.env.FRONTEND_URL);
console.log('BACKEND_URL:', process.env.BACKEND_URL);
console.log('');

const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
console.log('🔗 Computed success URL:', `${frontendUrl}/dashboard/billing?status=success&session_id={CHECKOUT_SESSION_ID}`);
console.log('🔗 Computed cancel URL:', `${frontendUrl}/dashboard/billing?status=cancelled`);

// Check if URLs are properly configured
if (!process.env.FRONTEND_URL) {
  console.log('⚠️ FRONTEND_URL not configured - using fallback');
} else {
  console.log('✅ FRONTEND_URL is configured');
}