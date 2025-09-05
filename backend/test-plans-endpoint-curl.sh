#!/bin/bash

# Test the plans endpoint directly to see what it returns
echo "🧪 Testing /api/billing/plans/available endpoint..."

# You'll need to replace this with a real auth token if available
# For now we'll test without auth to see basic response
curl -X GET "https://whatsapp-bot-backend-ihsv.onrender.com/api/billing/plans/available" \
  -H "Content-Type: application/json" \
  -w "\nHTTP Status: %{http_code}\n" \
  | jq '.'

echo ""
echo "🔍 This should show is_current: false for all plans if no auth"
echo "🔍 With proper auth token, Business plan should show is_current: true"