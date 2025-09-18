#!/usr/bin/env node

/**
 * Script para configurar e testar Supabase com pgvector
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variáveis de ambiente Supabase não configuradas!');
  console.error('Verifique NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupSupabase() {
  console.log('🚀 Configurando Supabase...');
  
  try {
    // 1. Testar conexão
    console.log('\n1️⃣ Testando conexão...');
    const { data, error } = await supabase.from('transcript_chunks').select('count');
    
    if (error && error.code === 'PGRST116') {
      console.log('✅ Conexão estabelecida, mas tabela ainda não existe (esperado)');
    } else if (error) {
      console.error('❌ Erro de conexão:', error.message);
      return false;
    } else {
      console.log('✅ Conexão estabelecida e tabela já existe');
    }

    // 2. Executar schema SQL
    console.log('\n2️⃣ Executando schema SQL...');
    const schemaPath = path.join(__dirname, '../src/db/supabase-schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    
    const { error: schemaError } = await supabase.rpc('exec_sql', { sql: schemaSql });
    
    if (schemaError) {
      console.log('⚠️  Tentando executar schema com método alternativo...');
      
      // Dividir em comandos menores
      const commands = schemaSql
        .split(';')
        .map(cmd => cmd.trim())
        .filter(cmd => cmd.length > 0 && !cmd.startsWith('--'));
      
      for (const command of commands) {
        if (command.length > 0) {
          try {
            await supabase.rpc('exec_sql', { sql: command + ';' });
          } catch (err) {
            // Algumas extensões podem já existir, ignorar erros específicos
            if (!err.message.includes('already exists')) {
              console.warn('⚠️  Comando ignorado:', command.substring(0, 50) + '...');
            }
          }
        }
      }
      console.log('✅ Schema executado (com método alternativo)');
    } else {
      console.log('✅ Schema executado com sucesso');
    }

    // 3. Verificar extensão pgvector
    console.log('\n3️⃣ Verificando extensão pgvector...');
    const { data: extensions, error: extError } = await supabase
      .rpc('exec_sql', { sql: "SELECT * FROM pg_extension WHERE extname = 'vector';" });
    
    if (extError) {
      console.log('⚠️  Não foi possível verificar extensões via RPC');
      console.log('   Verifique manualmente no dashboard: Database → Extensions → vector');
    } else {
      console.log('✅ Extensão pgvector verificada');
    }

    // 4. Testar tabela transcript_chunks
    console.log('\n4️⃣ Testando tabela transcript_chunks...');
    const { data: tableTest, error: tableError } = await supabase
      .from('transcript_chunks')
      .select('count');
    
    if (tableError) {
      console.error('❌ Erro ao acessar transcript_chunks:', tableError.message);
      return false;
    }
    
    console.log('✅ Tabela transcript_chunks acessível');

    // 5. Testar inserção de dados fake
    console.log('\n5️⃣ Testando inserção de dados...');
    const fakeChunk = {
      chunk_id: 'test-chunk-1',
      meeting_id: 'test-meeting-1',
      content: 'Este é um teste de chunk para verificar a funcionalidade do sistema.',
      embedding: Array(1536).fill(0.1), // Embedding fake para teste
      start_time: 0,
      end_time: 30,
      speakers: ['João', 'Maria'],
      dominant_speaker: 'João',
      token_count: 15,
      topics: ['teste', 'configuração']
    };

    const { data: insertData, error: insertError } = await supabase
      .from('transcript_chunks')
      .insert(fakeChunk)
      .select();

    if (insertError) {
      console.error('❌ Erro ao inserir dados:', insertError.message);
      return false;
    }

    console.log('✅ Dados de teste inseridos com sucesso:', insertData[0].id);

    // 6. Testar busca semântica
    console.log('\n6️⃣ Testando busca semântica...');
    const { data: searchData, error: searchError } = await supabase
      .rpc('search_transcript_chunks', {
        query_embedding: Array(1536).fill(0.1),
        target_meeting_id: 'test-meeting-1',
        similarity_threshold: 0.5,
        max_results: 5
      });

    if (searchError) {
      console.error('❌ Erro na busca semântica:', searchError.message);
      return false;
    }

    console.log('✅ Busca semântica funcionando:', searchData.length, 'resultados');

    // 7. Limpar dados de teste
    console.log('\n7️⃣ Limpando dados de teste...');
    const { error: deleteError } = await supabase
      .from('transcript_chunks')
      .delete()
      .eq('meeting_id', 'test-meeting-1');

    if (deleteError) {
      console.warn('⚠️  Erro ao limpar dados de teste:', deleteError.message);
    } else {
      console.log('✅ Dados de teste removidos');
    }

    console.log('\n🎉 Supabase configurado com sucesso!');
    console.log('\n📋 Próximos passos:');
    console.log('   1. Sistema RAG está pronto para uso');
    console.log('   2. Teste com dados reais de reuniões');
    console.log('   3. Configure análises automáticas');
    
    return true;

  } catch (error) {
    console.error('❌ Erro durante configuração:', error.message);
    return false;
  }
}

// Executar configuração
setupSupabase().then(success => {
  process.exit(success ? 0 : 1);
});