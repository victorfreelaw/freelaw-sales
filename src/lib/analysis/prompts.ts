// Versioned prompts for FreelawSales analysis engine
// Following Freelaw voice: corporativa, profissional, sóbria, transparente, inclusiva

import { clampText } from './utils';
import { SCRIPT_GUIDELINES, ICP_GUIDELINES } from './guidelines';

export const SYSTEM_PROMPT = `
Você é um especialista em análise de demos de vendas da Freelaw, com foco em escritórios de advocacia brasileiros.

CONTEXTO CRÍTICO:
- Esta é sempre uma DEMONSTRAÇÃO (demo), não uma descoberta
- Use o Script Demo (09/2025) como referência para aderência
- Use critérios ICP específicos da Freelaw para avaliação de fit
- NUNCA sugira "agendar outra demo" - foque em avançar decisão NA PRÓPRIA REUNIÃO

DIRETRIZES DE EVIDÊNCIA:
- Sempre cite trechos literais da transcrição entre aspas + timestamp
- Quando houver timestamp, use exatamente o formato [mm:ss-mm:ss] fornecido; se estiver ausente, informe "[timestamp indisponível]"
- Prefira trechos completos (2-4 frases) para justificar notas e objeções
- Se não há timestamp, estime com base na posição (ex: "início", "meio", "fim") e indique "estimado"
- Notas sempre de 0 a 10 com justificativa em 2-4 frases
- Não invente informações que não estão na transcrição
- Se algo não foi mencionado, diga explicitamente "não houve menção a X"

DIFERENCIAIS FREELAW (usar quando citar autoridade):
- 7 anos de mercado
- 700+ escritórios atendidos
- 9.000+ advogados na plataforma
- Produção artesanal sob medida
- Revisão gratuita em 2 dias
- Substituição de advogado se necessário
- Atendimento em urgências e prazos apertados

Sempre responda em JSON válido estruturado conforme solicitado.
`;

export function buildFullAnalysisPrompt(
  transcript: string,
  options?: { scriptGuidelines?: string; icpGuidelines?: string }
): string {
  const scriptSource = options?.scriptGuidelines?.trim()?.length
    ? options?.scriptGuidelines
    : SCRIPT_GUIDELINES;
  const icpSource = options?.icpGuidelines?.trim()?.length ? options?.icpGuidelines : ICP_GUIDELINES;

  const script = clampText(scriptSource, 8000);
  const icp = clampText(icpSource, 8000);
  const sampleJson = `{
  "aderencia_ao_script": {
    "score_geral": 64,
    "etapas": {
      "introducao": {
        "nota": 6,
        "justificativa": "Boa abertura com acolhimento, porém faltou validar agenda e autorização explícita: \"Posso gravar?\" [00:15-00:20].",
        "evidencias_que_sustentam": [
          "\"Boa tarde, tudo bem?\" [00:05-00:07]",
          "\"Vou explicar como a Freelaw pode apoiar vocês\" [00:40-00:45]"
        ],
        "faltou_para_10": [
          "Pedir autorização formal de gravação",
          "Estabelecer agenda com duração e objetivo",
          "Provocar decisão esperada ao final"
        ]
      },
      "exploracao_cenario": {
        "nota": 8,
        "justificativa": "Investigou estrutura e dores prioritárias: \"Hoje somos 8 advogados e estamos sobrecarregados\" [05:12-05:25]. Ainda faltou estimar volume de casos.",
        "evidencias_que_sustentam": [
          "\"Quantos advogados compõem o time hoje?\" [04:30-04:33]",
          "\"Estamos perdendo prazos em previdenciário\" [05:40-05:48]"
        ],
        "faltou_para_10": [
          "Quantificar volume mensal de processos",
          "Explorar crescimento dos últimos 12 meses"
        ]
      },
      "apresentacao_freelaw": { "nota": 7, "justificativa": "...", "evidencias_que_sustentam": ["..."], "faltou_para_10": ["..."] },
      "beneficios_escritorio": { "nota": 6, "justificativa": "...", "evidencias_que_sustentam": ["..."], "faltou_para_10": ["..."] },
      "metodologia": { "nota": 4, "justificativa": "...", "evidencias_que_sustentam": ["..."], "faltou_para_10": ["..."] },
      "como_funciona_delegacao": { "nota": 5, "justificativa": "...", "evidencias_que_sustentam": ["..."], "faltou_para_10": ["..."] },
      "conversa_com_prestador": { "nota": 3, "justificativa": "...", "evidencias_que_sustentam": ["..."], "faltou_para_10": ["..."] },
      "plano_ideal": { "nota": 5, "justificativa": "...", "evidencias_que_sustentam": ["..."], "faltou_para_10": ["..."] },
      "encerramento_follow_up": { "nota": 4, "justificativa": "...", "evidencias_que_sustentam": ["..."], "faltou_para_10": ["..."] }
    }
  },
  "analise_icp": {
    "status": "MEDIUM",
    "score_geral": 72,
    "criterios": {
      "porte_estrutura": {
        "classificacao": "medio",
        "evidencia": "\"Hoje somos 8 advogados\" [05:12-05:16]",
        "nota": 16
      },
      "faturamento": {
        "classificacao": "alto",
        "evidencia": "\"Giramos entre 60 e 70 mil/mês\" [05:45-05:50]",
        "nota": 18
      },
      "volume_casos": {
        "classificacao": "nao_mencionado",
        "evidencia": "Não houve menção explícita ao volume de casos; sugerir perguntar: \"Quantos processos ativos vocês tocam hoje?\"",
        "nota": 0
      },
      "dores_principais": {
        "classificacao": "alto",
        "evidencia": "\"Estamos sobrecarregados e perdendo prazos\" [05:20-05:48]",
        "nota": 20
      },
      "regiao": {
        "classificacao": "nao_mencionado",
        "evidencia": "Não houve menção a região; sugerir perguntar localização para avaliar atendimento híbrido",
        "nota": 0
      },
      "maturidade_digital": {
        "classificacao": "medio",
        "evidencia": "Inferência: mencionou uso de software jurídico básico [11:10-11:18]",
        "nota": 12
      },
      "perfil_decisao": {
        "classificacao": "medio",
        "evidencia": "\"Eu alinho com a sócia Ana antes de bater o martelo\" [32:40-32:48]",
        "nota": 6
      }
    },
    "vale_insistir": {
      "recomendacao": "Insistir se confirmar volume >100 casos e decisor final participar da validação",
      "condicoes": [
        "Confirmar volume mensal de casos",
        "Trazer sócia Ana para o fechamento",
        "Validar urgência em reduzir perdas de prazo"
      ],
      "status": "avaliar"
    },
    "observacoes": "Fit conceitual forte nas dores; faltam dados de volume e decisor final."
  },
  "analise_objecoes": {
    "lista": [
      {
        "categoria": "confiança",
        "cliente_citacao_ampliada": "\"Nunca trabalhamos com equipe externa, fico receoso com qualidade\" [26:12-26:35]. \"Já tivemos problema com terceirização\" [26:35-26:45]",
        "resposta_vendedor_citacao": "\"Entendo, temos 700+ escritórios e revisão gratuita em 48h\" [26:46-26:58]",
        "avaliacao_resposta": {
          "nota": 6,
          "racional": "Usou autoridade, mas faltou prova tangível e próximo passo dentro da demo."
        },
        "resposta_sugerida": {
          "texto": "Mostrar case do Escritório Lima (mesmo porte) e oferecer revisão gratuita das 3 primeiras peças com substituição garantida.",
          "por_que_funciona": "Reduz risco percebido e ancora no diferencial artesanal e revisão gratuita."
        },
        "proximo_passo_demo": "Compartilhar tela com case, abrir fluxo de delegação e simular peça teste."
      }
    ],
    "kpis": {
      "total": 2,
      "tratadas_efetivamente": 1,
      "score_medio_por_categoria": { "confiança": 6, "preco": 4 },
      "principais_lacunas": ["Faltou ROI quantificado", "Provas tangíveis de qualidade"]
    }
  },
  "pontos_positivos": [
    "\"Estamos aqui pra entender o cenário de vocês\" [03:10-03:15] - postura consultiva",
    "\"Sobrecarga em previdenciário\" [05:20-05:35] - dor crítica identificada",
    "Demonstração do dashboard destacando SLAs [18:05-18:40]"
  ],
  "pontos_a_melhorar": [
    "Não explorou volume de casos (lacuna de ICP)",
    "Metodologia explicada de forma superficial [21:10-21:40]",
    "Encerramento sem definir responsabilidade do próximo passo"
  ],
  "sugestoes_praticas": [
    {
      "sugestao": "Aplicar roteiro de ROI com 3 perguntas",
      "como_executar": ["1. Perguntar horas semanais gastas em tarefas operacionais", "2. Multiplicar pelo custo hora da equipe", "3. Comparar com investimento proposto"],
      "impacto": "Ancorar valor financeiro concreto"
    },
    {
      "sugestao": "Mostrar fluxo de delegação ao vivo",
      "como_executar": ["1. Abrir dashboard", "2. Criar tarefa exemplo", "3. Mostrar revisão em 48h"],
      "impacto": "Evidenciar diferencial artesanal e prazos"
    }
  ],
  "resumo_executivo": "ICP médio-alto (8 advogados, R$60-70k/mês) com dores intensas de sobrecarga e prazos. Demo avançou em dores e interesse, mas faltou metodologia e plano ideal robusto. Risco principal: falta de decisor final e ausência de ROI. Âncora de valor: operação artesanal com revisão gratuita e redução de 60% da carga operacional.",
  "proxima_acao_recomendada": {
    "acao": "Enviar proposta personalizada com case similar e ROI calculado",
    "prazo": "24 horas",
    "racional": "Manter momentum após interesse explícito e cobrir lacuna de ROI",
    "condicoes": ["Confirmar volume mensal", "Validar participação da sócia Ana"]
  },
  "mensagem_sugerida": {
    "texto": "Olá [Nome], obrigado por compartilhar os desafios de sobrecarga e perdas de prazo. Conforme alinhamos, segue proposta para reduzir 60% da carga operacional com revisão gratuita das 3 primeiras peças e substituição garantida. Posso te mostrar amanhã como organizamos o fluxo de delegação para o time?",
    "por_que_funciona": "Refresca dor principal, oferece prova tangível (revisão gratuita) e avança decisão dentro do prazo combinado."
  },
  "checklist_follow_up": [
    "Confirmar volume de processos ativos e entrantes",
    "Validar quem aprova orçamento e timeline",
    "Enviar case study de previdenciário com SLAs cumpridos"
  ]
}`;

  return [
    'ANÁLISE INTEGRADA DA DEMO FREELAW (RELATÓRIO COMPLETO)',
    '',
    'Esta análise SEMPRE considera uma reunião de demonstração (demo).',
    '',
    'SCRIPT DEMO FREELAW (09/2025):',
    script,
    '',
    'CRITÉRIOS ICP FREELAW:',
    icp,
    '',
    'TRANSCRIÇÃO COMPLETA:',
    transcript,
    '',
    'INSTRUÇÕES CRÍTICAS:',
    '1) Aderência ao Script — notas 0-10 para TODAS as etapas. Para cada etapa:',
    '   - Justificativa em 2-4 frases com quotes literais + timestamp',
    '   - "Evidências que sustentam a nota" (lista de quotes + timestamp)',
    '   - "O que faltou para 10/10" (checklist com itens práticos)',
    '2) Análise de ICP — NÃO deixar campos vazios. Para cada critério, classificar (alto/médio/baixo ou não mencionado) e justificar com evidência (quote + timestamp). Quando inferir, explicitar "inferência" e lógica.',
    '   - Manter score geral 0–100 e status HIGH/MEDIUM/LOW',
    '   - Campos obrigatórios: porte_estrutura, faturamento, volume_casos, dores_principais, regiao, maturidade_digital, perfil_decisao',
    '   - "Vale insistir?": recomendação + condições objetivas',
    '3) Objeções — listar TODAS. Para cada:',
    '   - Categoria (confiança, funcionalidade, preço, tempo/urgência, necessidade, concorrência, etc.)',
    '   - Citação do cliente (2-4 frases contínuas) com timestamp início–fim',
    '   - Resposta do vendedor (2-4 frases) com timestamp',
    '   - Avaliação da resposta (nota 0-10 + racional)',
    '   - Resposta sugerida (texto prático + motivo de eficácia)',
    '   - Próximo passo dentro da demo (não sugerir outra demo)',
    '   - KPIs: total, tratadas efetivamente, score médio por categoria, principais lacunas',
    '4) Todas as citações devem usar os timestamps informados; nunca invente ou ajuste valores. Se o timestamp não existir, cite explicitamente "[timestamp indisponível]"',
    '5) Pontos Positivos / Pontos a Melhorar / Sugestões Práticas — sempre ancorados em evidências e, quando for sugestão, trazer 1-3 passos para executar',
    '6) Resumo Executivo (até 5 linhas) + Próxima Ação Recomendada + Mensagem sugerida + Checklist de follow-up',
    '7) Sempre incluir timestamps; se estimado, indique "estimado"',
    '8) Respeitar ordem das seções e retornar JSON exatamente no formato abaixo',
    '',
    'FORMATO JSON DE RESPOSTA (EXEMPLO):',
    sampleJson,
    '',
    'Retorne APENAS JSON válido seguindo a estrutura acima.',
  ].join('\n');
}
