// Endpoint para testar o sistema RAG completo
// Simula o processamento de uma reunião longa para validar a implementação

import { NextRequest, NextResponse } from 'next/server';
import { createAnalysisPipeline } from '@/lib/analysis/analysis-pipeline';
import { createRAGChatEngine } from '@/lib/chat/rag-chat-engine';

// Transcrição de exemplo longa (simulando 40-60 min)
const LONG_TRANSCRIPT_SAMPLE = `
00:00:00 - Ygor Vitalino (Freelaw): Oi, doutora Vívia, tudo bem? Como foi esses dias analisando nossa proposta?

00:00:15 - Vívian: Olá Ygor! Então, eu fiquei bem impressionada com o que vocês apresentaram. Meu escritório realmente está sofrendo com sobrecarga de trabalho. Temos 8 advogados e a demanda previdenciária está crescendo muito.

00:02:30 - Ygor Vitalino (Freelaw): Perfeito! E qual é o faturamento médio mensal do escritório atualmente?

00:02:45 - Vívian: Estamos faturando em torno de 180 mil por mês, mas podia ser muito mais se tivéssemos mais capacidade. Perdemos muitos clientes por não conseguir atender todos os prazos.

00:05:00 - Ygor Vitalino (Freelaw): Entendo perfeitamente. A Freelaw tem exatamente a solução para isso. Nossa metodologia de delegação permite que vocês mantenham o relacionamento com o cliente enquanto terceirizam a produção dos processos.

00:07:30 - Vívian: Como funciona essa delegação na prática? Eu tenho receio de perder o controle sobre a qualidade.

00:08:00 - Ygor Vitalino (Freelaw): Excelente pergunta! Nós temos um processo rigoroso. Primeiro, vocês nos enviam o caso. Nossos advogados especializados fazem toda a pesquisa e produção. Depois, enviamos para revisão de vocês em até 48 horas. Se não estiver perfeito, refazemos sem custo.

00:12:15 - Vívian: E qual seria o investimento? Preciso avaliar se cabe no nosso orçamento atual.

00:12:30 - Ygor Vitalino (Freelaw): Para um escritório do porte de vocês, recomendamos o plano Premium de R$ 4.500 mensais. Isso dá direito a 50 demandas mensais, suporte prioritário e treinamento da equipe.

00:13:00 - Vívian: Hmm, é um valor considerável. Preciso pensar...

00:13:15 - Ygor Vitalino (Freelaw): Doutora, vamos fazer uma conta rápida. Se vocês conseguirem atender 20% mais clientes por mês sem contratar pessoas, quanto seria o retorno?

00:15:30 - Vívian: Realmente, se conseguirmos atender mais 20 clientes por mês, com ticket médio de 2 mil, seria 40 mil a mais de faturamento...

00:18:00 - Ygor Vitalino (Freelaw): Exato! O retorno é praticamente 9 vezes o investimento. Além disso, vocês teriam mais tempo para focar no relacionamento com clientes e captação.

00:22:00 - Vívian: Faz sentido mesmo. Mas como posso ter certeza de que vai funcionar para o meu escritório?

00:22:30 - Ygor Vitalino (Freelaw): Temos mais de 700 escritórios atendidos em 7 anos de mercado. Posso te mostrar cases similares ao seu. O Dr. Santiago de Goiânia tinha exatamente o mesmo perfil e hoje fatura 40% mais.

00:25:00 - Vívian: Ok, isso me tranquiliza. E se eu quiser parar, como funciona?

00:25:15 - Ygor Vitalino (Freelaw): Sem problema! O contrato é mensal, você pode cancelar quando quiser. Mas tenho certeza que vocês vão adorar os resultados.

00:28:00 - Vívian: Preciso conversar com meus sócios antes de decidir. Qual o próximo passo?

00:28:30 - Ygor Vitalino (Freelaw): Perfeito! Vou enviar uma proposta formal hoje ainda. Podemos agendar uma conversa para sexta-feira para você me dar o feedback dos sócios?

00:29:00 - Vívian: Sim, sexta às 14h funciona perfeitamente. Muito obrigada pela apresentação, Ygor!

00:29:30 - Ygor Vitalino (Freelaw): Eu que agradeço, doutora! Tenho certeza que será uma parceria de muito sucesso. Até sexta!
`;

export async function GET(request: NextRequest) {
  try {
    console.log('🚀 Iniciando teste completo do sistema RAG...');

    // 1. Teste de inicialização
    const pipeline = createAnalysisPipeline();
    const chatEngine = createRAGChatEngine();

    if (!pipeline) {
      return NextResponse.json({
        success: false,
        error: 'Pipeline de análise não disponível',
        details: 'Verifique as configurações de API keys'
      }, { status: 500 });
    }

    if (!chatEngine) {
      return NextResponse.json({
        success: false,
        error: 'RAG Chat Engine não disponível',
        details: 'Verifique a configuração do OpenAI'
      }, { status: 500 });
    }

    // 2. Health check do sistema
    const systemHealth = await pipeline.getSystemHealth();
    console.log('🏥 Health check:', systemHealth);

    // 3. Teste do pipeline completo (versão rápida)
    const testMeetingId = `test_meeting_${Date.now()}`;
    
    console.log('⚡ Executando análise rápida...');
    const quickAnalysis = await pipeline.executeQuickAnalysis(
      testMeetingId,
      LONG_TRANSCRIPT_SAMPLE
    );

    // 4. Teste do chat RAG
    const testQuestions = [
      'Qual o faturamento atual do escritório?',
      'Como funciona a metodologia de delegação?',
      'Este cliente se encaixa no ICP ideal?',
      'Qual foi a objeção sobre preço?'
    ];

    const chatResults = [];
    for (const question of testQuestions.slice(0, 2)) { // Testa apenas 2 para ser rápido
      try {
        const chatResponse = await chatEngine.answer({
          question,
          meetingId: testMeetingId,
          maxResults: 3,
          includeTimestamps: true
        });
        
        chatResults.push({
          question,
          answer: chatResponse.answer.slice(0, 200) + '...',
          sourceType: chatResponse.sourceType,
          relevantChunks: chatResponse.relevantChunks.length,
          processingTime: chatResponse.processingTime
        });
      } catch (error) {
        console.error(`Erro na pergunta "${question}":`, error);
        chatResults.push({
          question,
          error: error instanceof Error ? error.message : 'Erro desconhecido'
        });
      }
    }

    // 5. Estatísticas finais
    const finalStats = await pipeline.getRagService().getStats(testMeetingId);

    const testResult = {
      success: true,
      timestamp: new Date().toISOString(),
      testMeetingId,
      systemHealth,
      quickAnalysis: {
        success: quickAnalysis.success,
        summary: quickAnalysis.summary?.slice(0, 200) + '...',
        processingTime: quickAnalysis.processingTime
      },
      chatTests: chatResults,
      ragStats: finalStats,
      components: {
        pipeline: !!pipeline,
        chatEngine: !!chatEngine,
        ragService: systemHealth.ragService,
        multiModel: systemHealth.multiModel
      }
    };

    console.log('✅ Teste completo do sistema RAG finalizado com sucesso!');
    
    return NextResponse.json(testResult);

  } catch (error) {
    console.error('❌ Erro no teste do sistema RAG:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

// Endpoint para limpar dados de teste
export async function DELETE(request: NextRequest) {
  try {
    const pipeline = createAnalysisPipeline();
    if (!pipeline) {
      return NextResponse.json({ success: false, error: 'RAG Service indisponível' });
    }

    // Aqui poderia implementar limpeza de dados de teste
    // Por enquanto só retorna confirmação
    
    return NextResponse.json({
      success: true,
      message: 'Dados de teste limpos (funcionalidade a implementar)'
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro na limpeza'
    }, { status: 500 });
  }
}
