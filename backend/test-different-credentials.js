require('dotenv').config();

async function testDifferentCredentials() {
  console.log('\n🧪 Testing Different MercadoPago Credentials\n');
  
  // Credenciales actuales en .env
  const currentToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
  console.log('📌 Current Token:', currentToken?.substring(0, 20) + '...');
  
  // Credenciales del MERCADOPAGO.md que seleccionaste
  const alternativeToken = 'TEST-6905559224909465-090406-7377ba8aec1ccc0fee8fa4bcc5cf8038-62226130';
  console.log('📌 Alternative Token:', alternativeToken.substring(0, 20) + '...');
  
  // Función para probar un token
  async function testToken(token, name) {
    console.log(`\n🔍 Testing ${name}:`);
    
    try {
      const response = await fetch('https://api.mercadopago.com/users/me', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const data = await response.json();
      
      if (data.id) {
        console.log('✅ Token válido');
        console.log('📌 User ID:', data.id);
        console.log('📌 Nickname:', data.nickname);
        console.log('📌 Country:', data.country_id);
        console.log('📌 Test User?:', data.tags?.includes('test_user'));
        console.log('📌 Site ID:', data.site_id);
        
        if (data.test_data) {
          console.log('🧪 Test Data:', data.test_data);
        }
        
        return { valid: true, data };
      } else {
        console.log('❌ Token inválido:', data);
        return { valid: false, data };
      }
      
    } catch (error) {
      console.log('❌ Error:', error.message);
      return { valid: false, error: error.message };
    }
  }
  
  // Probar ambos tokens
  const currentResult = await testToken(currentToken, 'Current (.env)');
  const alternativeResult = await testToken(alternativeToken, 'Alternative (MERCADOPAGO.md)');
  
  console.log('\n📊 RESUMEN:');
  console.log('Current Token Valid:', currentResult.valid);
  console.log('Alternative Token Valid:', alternativeResult.valid);
  
  // Verificar compatibilidad de usuarios
  if (currentResult.valid && alternativeResult.valid) {
    console.log('\n🤝 Compatibilidad de usuarios:');
    console.log('Current User Country:', currentResult.data.country_id);
    console.log('Alternative User Country:', alternativeResult.data.country_id);
    console.log('Same Country?:', currentResult.data.country_id === alternativeResult.data.country_id);
    
    // Verificar si son usuarios relacionados
    if (currentResult.data.test_data && alternativeResult.data.test_data) {
      console.log('Current Owner:', currentResult.data.test_data.user_owner);
      console.log('Alternative Owner:', alternativeResult.data.test_data.user_owner);
      console.log('Same Owner?:', currentResult.data.test_data.user_owner === alternativeResult.data.test_data.user_owner);
    }
  }
}

testDifferentCredentials();