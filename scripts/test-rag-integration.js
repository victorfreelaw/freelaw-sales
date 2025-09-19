#!/usr/bin/env node

/**
 * Script para disparar o endpoint `/api/test-rag-system`.
 * Requer que o Next.js esteja rodando localmente (ex.: `npm run dev`).
 */

require('dotenv').config({ path: '.env.local' });

const API_URL = process.env.RAG_TEST_URL || 'http://localhost:3000/api/test-rag-system';

async function run() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 120_000);

  try {
    console.log('🧪 Disparando teste de ponta a ponta via', API_URL);
    const response = await fetch(API_URL, { signal: controller.signal });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Status ${response.status}: ${body}`);
    }

    const payload = await response.json();

    console.log('\n📊 Resultado resumido:');
    console.log('  • Execução:', payload.success ? 'OK' : 'Falhou');
    console.log('  • Health check:', JSON.stringify(payload.systemHealth, null, 2));
    if (payload.quickAnalysis) {
      console.log('  • Resumo rápido:', payload.quickAnalysis.summary);
      console.log('  • Tempo processamento (ms):', payload.quickAnalysis.processingTime);
    }
    console.log('  • Chat tests:', JSON.stringify(payload.chatTests ?? [], null, 2));
    console.log('  • RAG stats:', JSON.stringify(payload.ragStats ?? {}, null, 2));

    console.log('\n✅ Teste concluído. Confira o relatório completo no payload acima.');
    process.exit(0);
  } catch (error) {
    if (error.name === 'AbortError') {
      console.error('⏱️ Tempo limite atingido. Verifique se o servidor Next.js está rodando.');
    } else {
      console.error('❌ Erro ao executar teste RAG:', error.message);
    }
    process.exit(1);
  } finally {
    clearTimeout(timeout);
  }
}

run();
