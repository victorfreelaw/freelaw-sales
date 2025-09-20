// Script para testar todas as configurações
// Execute: node scripts/test-config.js

require('dotenv').config({ path: '.env.local' });

async function testConfigurations() {
  console.log('🧪 TESTANDO CONFIGURAÇÕES DO FREELAW RAG SYSTEM\n');

  // 1. Teste OpenAI
  console.log('1️⃣ Testando OpenAI...');
  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey || openaiKey.includes('fake')) {
    console.log('   ❌ OPENAI_API_KEY não configurada');
  } else if (!openaiKey.startsWith('sk-')) {
    console.log('   ❌ OPENAI_API_KEY formato inválido');
  } else {
    console.log('   ✅ OPENAI_API_KEY configurada corretamente');
    
    try {
      const OpenAI = require('openai');
      const openai = new OpenAI({ apiKey: openaiKey });
      
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: 'test' }],
        max_tokens: 1
      });
      
      console.log('   ✅ OpenAI API funcionando!');
    } catch (error) {
      console.log('   ❌ Erro na OpenAI:', error.message);
    }
  }

  // 2. Teste Gemini
  console.log('\n2️⃣ Testando Gemini...');
  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey || geminiKey.includes('fake')) {
    console.log('   ❌ GEMINI_API_KEY não configurada');
  } else if (!/^AI[a-zA-Z0-9_-]{20,}$/.test(geminiKey) && !geminiKey.startsWith('AIza')) {
    console.log('   ❌ GEMINI_API_KEY formato inválido');
  } else {
    console.log('   ✅ GEMINI_API_KEY configurada corretamente');
    
    try {
      const { GoogleGenerativeAI } = require('@google/generative-ai');
      const genAI = new GoogleGenerativeAI(geminiKey);
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });
      await model.generateContent({ contents: [{ role: 'user', parts: [{ text: 'teste rápido' }] }] });
      
      console.log('   ✅ Gemini API funcionando!');
    } catch (error) {
      console.log('   ❌ Erro no Gemini:', error.message);
    }
  }

  // 3. Teste Supabase
  console.log('\n3️⃣ Testando Supabase...');
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || supabaseUrl.includes('fake')) {
    console.log('   ❌ NEXT_PUBLIC_SUPABASE_URL não configurada');
  } else if (!supabaseKey || supabaseKey.includes('fake')) {
    console.log('   ❌ SUPABASE_SERVICE_ROLE_KEY não configurada');
  } else {
    console.log('   ✅ Chaves Supabase configuradas');
    
    try {
      const { createClient } = require('@supabase/supabase-js');
      const supabase = createClient(supabaseUrl, supabaseKey);
      
      const { data, error } = await supabase
        .from('transcript_chunks')
        .select('count', { count: 'exact', head: true });
        
      if (error) {
        console.log('   ⚠️ Tabelas não encontradas - execute o setup do banco');
      } else {
        console.log('   ✅ Supabase e tabelas funcionando!');
      }
    } catch (error) {
      console.log('   ❌ Erro no Supabase:', error.message);
    }
  }

  // 4. Teste do Sistema Completo
  console.log('\n4️⃣ Testando Sistema RAG...');
  try {
    // Simula o teste do sistema
    const axios = require('axios');
    const response = await axios.get('http://localhost:3000/api/test-rag-system');
    
    if (response.data.success) {
      console.log('   ✅ Sistema RAG funcionando perfeitamente!');
      console.log(`   📊 Componentes: ${Object.values(response.data.components).filter(Boolean).length}/4`);
    } else {
      console.log('   ❌ Sistema RAG com problemas');
    }
  } catch (error) {
    console.log('   ⚠️ Servidor não está rodando ou erro no sistema');
  }

  console.log('\n🎯 RESUMO:');
  console.log('📋 Para configuração completa você precisa:');
  console.log('1. ✅ OpenAI configurada');
  console.log('2. ⏳ Gemini API Key');
  console.log('3. ⏳ Supabase URL + Service Key');
  console.log('4. ⏳ Executar setup do banco');
  
  console.log('\n🚀 Após configurar tudo:');
  console.log('node scripts/setup-supabase.js');
  console.log('curl http://localhost:3000/api/test-rag-system');
}

testConfigurations().catch(console.error);
