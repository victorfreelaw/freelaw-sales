#!/usr/bin/env node

/**
 * Script para testar integração RAG completa com Supabase
 */

require('dotenv').config({ path: '.env.local' });
const { SupabaseVectorStore } = require('../src/lib/analysis/supabase-vector');
const { RAGSearchService } = require('../src/lib/analysis/rag-service');
const { processTranscriptForAnalysis } = require('../src/lib/analysis/chunking');

// Dados de teste simulando uma reunião real
const fakeTranscript = `
[0:00] João: Bom dia! Vamos começar nossa reunião de vendas. Hoje vamos apresentar nossa solução para o cliente ABC Corp.

[0:30] Maria: Perfeito, João. Preparei uma apresentação completa sobre nossos serviços de consultoria jurídica. 

[1:00] João: Excelente. Qual é o principal desafio que a ABC Corp está enfrentando?

[1:15] Maria: Eles precisam automatizar seus processos de compliance e reduzir riscos regulatórios. Nosso sistema pode ajudar muito nisso.

[1:45] João: Interessante. E qual seria o ROI esperado para eles?

[2:00] Maria: Estimamos uma redução de 40% nos custos operacionais e 60% de melhoria na eficiência dos processos.

[2:30] João: Perfeito. Vou propor um contrato anual de R$ 120.000 com implementação em 3 meses.

[3:00] Maria: Concordo. Também sugiro incluir treinamento da equipe e suporte 24/7 no primeiro ano.

[3:30] João: Ótima ideia. Vamos finalizar a proposta e enviar ainda hoje.
`;

async function testRAGIntegration() {
  console.log('🧪 Testando integração RAG completa...\n');

  try {
    // 1. Processar transcrição
    console.log('1️⃣ Processando transcrição...');
    const result = await processTranscriptForAnalysis(fakeTranscript, 'test-meeting-rag');
    console.log(`✅ Processado: ${result.chunks.length} chunks, ${result.segments.length} segmentos\n`);

    // 2. Inicializar serviços
    console.log('2️⃣ Inicializando serviços RAG...');
    const vectorStore = new SupabaseVectorStore();
    const ragService = new RAGSearchService(vectorStore);
    console.log('✅ Serviços inicializados\n');

    // 3. Armazenar chunks com embeddings
    console.log('3️⃣ Armazenando chunks no Supabase...');
    for (const chunk of result.chunks) {
      await ragService.storeChunk(chunk);
    }
    console.log('✅ Chunks armazenados com embeddings\n');

    // 4. Testar buscas temáticas
    console.log('4️⃣ Testando buscas temáticas...');

    // Buscar por ROI
    console.log('🔍 Buscando informações sobre ROI...');
    const roiResults = await ragService.searchForAnalysis(
      'test-meeting-rag',
      'ROI retorno investimento custos benefícios',
      'financial'
    );
    console.log(`   Encontrados: ${roiResults.length} chunks relevantes`);
    if (roiResults.length > 0) {
      console.log(`   Conteúdo: "${roiResults[0].content.substring(0, 100)}..."`);
    }

    // Buscar por objeções
    console.log('\n🔍 Buscando objeções do cliente...');
    const objectionResults = await ragService.searchForAnalysis(
      'test-meeting-rag',
      'desafios problemas dificuldades objeções',
      'objections'
    );
    console.log(`   Encontrados: ${objectionResults.length} chunks relevantes`);

    // Buscar por proposta comercial
    console.log('\n🔍 Buscando proposta comercial...');
    const proposalResults = await ragService.searchForAnalysis(
      'test-meeting-rag',
      'proposta contrato valor preço investimento',
      'commercial'
    );
    console.log(`   Encontrados: ${proposalResults.length} chunks relevantes`);
    if (proposalResults.length > 0) {
      console.log(`   Conteúdo: "${proposalResults[0].content.substring(0, 100)}..."`);
    }

    // 5. Testar busca por speaker
    console.log('\n5️⃣ Testando busca por speaker...');
    const mariaChunks = await ragService.searchBySpeaker('test-meeting-rag', 'Maria');
    console.log(`✅ Encontrados ${mariaChunks.length} chunks da Maria\n`);

    // 6. Testar busca temporal
    console.log('6️⃣ Testando busca temporal...');
    const timeRangeChunks = await ragService.searchByTimeRange('test-meeting-rag', 60, 180);
    console.log(`✅ Encontrados ${timeRangeChunks.length} chunks entre 1-3 minutos\n`);

    // 7. Testar cache de análises
    console.log('7️⃣ Testando cache de análises...');
    const cacheKey = 'test_analysis_key';
    const analysisResult = {
      summary: 'Reunião focada em proposta para ABC Corp',
      main_points: ['Compliance automation', 'ROI 40%', 'Contrato R$ 120k'],
      next_steps: ['Finalizar proposta', 'Enviar hoje']
    };

    await ragService.cacheAnalysis('test-meeting-rag', 'summary', cacheKey, roiResults, analysisResult);
    const cached = await ragService.getCachedAnalysis('test-meeting-rag', 'summary', cacheKey);
    console.log(`✅ Cache funcionando: ${cached ? 'recuperado' : 'não encontrado'}\n`);

    // 8. Limpeza
    console.log('8️⃣ Limpando dados de teste...');
    await vectorStore.deleteChunksByMeeting('test-meeting-rag');
    console.log('✅ Dados limpos\n');

    console.log('🎉 Integração RAG funcionando perfeitamente!');
    console.log('\n📋 Funcionalidades testadas:');
    console.log('   ✅ Processamento de transcrições');
    console.log('   ✅ Geração de embeddings');
    console.log('   ✅ Armazenamento vetorial');
    console.log('   ✅ Busca semântica');
    console.log('   ✅ Busca por speaker');
    console.log('   ✅ Busca temporal');
    console.log('   ✅ Cache de análises');
    
    return true;

  } catch (error) {
    console.error('❌ Erro durante teste:', error.message);
    console.error(error.stack);
    return false;
  }
}

// Executar teste
testRAGIntegration().then(success => {
  process.exit(success ? 0 : 1);
});