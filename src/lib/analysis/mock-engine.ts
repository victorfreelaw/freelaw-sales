import { AnalysisResult } from './engine';
import type { FullAnalysisReport, ScriptStageId } from '@/types/analysis';

const STAGES: ScriptStageId[] = [
  'introducao',
  'exploracao_cenario',
  'apresentacao_freelaw',
  'beneficios_escritorio',
  'metodologia',
  'como_funciona_delegacao',
  'conversa_com_prestador',
  'plano_ideal',
  'encerramento_follow_up',
];

// Simple heuristic-based mock analysis for local testing without LLM
export class MockAnalysisEngine {
  // segments argument mantido apenas para manter interface consistente
  async analyzeTranscript(transcript: string, meetingId: string, _segments?: any): Promise<AnalysisResult> {
    const t = transcript.toLowerCase();

    const has = (regex: RegExp) => regex.test(t);

    const stageScore = (condition: boolean): number => (condition ? 7 : 4) + Math.random() * 2;

    const stageEvidence = (label: string): string[] => [
      `"${label} mencionada" [estimado]`
    ];

    const stageReport = STAGES.reduce((acc, stage) => {
      const flag = has(new RegExp(stage.split('_')[0]));
      acc[stage] = {
        nota: Math.min(10, Math.max(0, Number(stageScore(flag).toFixed(1)))),
        justificativa: `Justificativa simulada para ${stage}.`,
        evidencias_que_sustentam: stageEvidence(stage),
        faltou_para_10: [
          `Detalhar ${stage} com dados reais`,
          `Adicionar exemplo tangível de ${stage}`,
        ],
      };
      return acc;
    }, {} as FullAnalysisReport['aderencia_ao_script']['etapas']);

    const report: FullAnalysisReport = {
      aderencia_ao_script: {
        score_geral: 65,
        etapas: stageReport,
      },
      analise_icp: {
        status: 'MEDIUM',
        score_geral: 70,
        criterios: {
          porte_estrutura: {
            classificacao: 'medio',
            evidencia: '"Temos 6 advogados" [estimado]',
            nota: 14,
          },
          faturamento: {
            classificacao: 'medio',
            evidencia: '"Faturamos cerca de 50 mil" [estimado]',
            nota: 15,
          },
          volume_casos: {
            classificacao: has(/processos|casos/) ? 'medio' : 'nao_mencionado',
            evidencia: has(/processos|casos/) ? '"Temos uns 150 processos ativos" [estimado]' : 'Não houve menção explícita ao volume de casos; sugerir perguntar.',
            nota: has(/processos|casos/) ? 12 : 0,
          },
          dores_principais: {
            classificacao: has(/sobrecarga|prazo|retrabalho/) ? 'alto' : 'medio',
            evidencia: has(/sobrecarga|prazo|retrabalho/) ? '"Estamos sobrecarregados" [estimado]' : 'Inferência: dores mencionadas de forma superficial.',
            nota: has(/sobrecarga|prazo|retrabalho/) ? 18 : 12,
          },
          regiao: {
            classificacao: 'nao_mencionado',
            evidencia: 'Não houve menção a região; sugerir perguntar localização.',
            nota: 0,
          },
          maturidade_digital: {
            classificacao: 'medio',
            evidencia: 'Inferência: participou de reunião online sem dificuldades.',
            nota: 10,
          },
          perfil_decisao: {
            classificacao: has(/sócio|decisão|aprovação/) ? 'medio' : 'nao_mencionado',
            evidencia: has(/sócio|decisão|aprovação/) ? '"Preciso alinhar com meu sócio" [estimado]' : 'Não houve menção clara ao decisor final.',
            nota: has(/sócio|decisão|aprovação/) ? 8 : 0,
          },
        },
        vale_insistir: {
          recomendacao: 'Insistir se confirmar volume >100 casos.',
          condicoes: [
            'Confirmar volume mensal',
            'Validar decisor final e orçamento',
          ],
          status: 'avaliar',
        },
        observacoes: 'Mock gerado sem transcrição real.',
      },
      analise_objecoes: {
        lista: has(/caro|preço|custo/)
          ? [
              {
                categoria: 'preço',
                cliente_citacao_ampliada: '"Está um pouco acima do que pagamos hoje" [estimado].',
                resposta_vendedor_citacao: '"Posso te mostrar o ROI projetado" [estimado].',
                avaliacao_resposta: {
                  nota: 6,
                  racional: 'Apresenta intenção de ROI, porém pouco tangível.',
                },
                resposta_sugerida: {
                  texto: 'Ancorar economia de horas da equipe e revisar 3 peças gratuitamente.',
                  por_que_funciona: 'Reduz risco percebido ao tangibilizar retorno.',
                },
                proximo_passo_demo: 'Calcular ROI ao vivo com dados do cliente.',
              },
            ]
          : [],
        kpis: {
          total: has(/caro|preço|custo/) ? 1 : 0,
          tratadas_efetivamente: has(/caro|preço|custo/) ? 0 : 0,
          score_medio_por_categoria: has(/caro|preço|custo/) ? { preco: 6 } : {},
          principais_lacunas: ['Faltou ROI tangível', 'Necessário case similar'],
        },
      },
      pontos_positivos: [
        '"Boa tarde, obrigado por participar" [estimado] - Rapport inicial',
        'Identificou sobrecarga operacional [estimado]',
      ],
      pontos_a_melhorar: [
        'Não quantificou volume de casos',
        'Metodologia apresentada superficialmente',
      ],
      sugestoes_praticas: [
        {
          sugestao: 'Aplicar roteiro de ROI com 3 perguntas',
          como_executar: [
            '1. Perguntar horas gastas em tarefas operacionais',
            '2. Calcular custo dessas horas',
            '3. Comparar com investimento Freelaw',
          ],
          impacto: 'Ancorar valor financeiro tangível',
        },
      ],
      resumo_executivo: 'Mock: escritório de porte médio com dores de sobrecarga. Interesse moderado, faltam dados de volume e decisor final.',
      proxima_acao_recomendada: {
        acao: 'Enviar proposta resumida com case similar',
        prazo: '24 horas',
        racional: 'Manter momentum mesmo em ambiente de teste.',
        condicoes: ['Coletar volume de casos', 'Validar decisor final'],
      },
      mensagem_sugerida: {
        texto: 'Olá [Nome], obrigado pelo tempo. Segue material com revisão gratuita para as 3 primeiras peças e estimativa de economia de 40 horas mensais.',
        por_que_funciona: 'Conecta dor de sobrecarga com diferencial de revisão gratuita.',
      },
      checklist_follow_up: [
        'Confirmar volume mensal de casos',
        'Entender quem aprova orçamento',
        'Enviar case study semelhante',
      ],
    };

    return {
      report,
      scriptScore: report.aderencia_ao_script.score_geral,
      icpFit: report.analise_icp.status.toLowerCase() as 'high' | 'medium' | 'low',
      summary: report.resumo_executivo,
      nextAction: report.proxima_acao_recomendada.acao,
      processingTimeMs: 50,
    };
  }
}
