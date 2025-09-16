export type ScriptStageId =
  | 'introducao'
  | 'exploracao_cenario'
  | 'apresentacao_freelaw'
  | 'beneficios_escritorio'
  | 'metodologia'
  | 'como_funciona_delegacao'
  | 'conversa_com_prestador'
  | 'plano_ideal'
  | 'encerramento_follow_up';

export interface ScriptStageEvaluation {
  nota: number;
  justificativa: string;
  evidencias_que_sustentam: string[];
  faltou_para_10: string[];
}

export interface ScriptAdherenceReport {
  score_geral: number;
  etapas: Record<ScriptStageId, ScriptStageEvaluation>;
}

export type IcpFitStatus = 'HIGH' | 'MEDIUM' | 'LOW';

export interface IcpCriterionEvaluation {
  classificacao: 'alto' | 'medio' | 'baixo' | 'nao_mencionado';
  evidencia: string;
  nota: number;
}

export interface IcpAnalysisReport {
  status: IcpFitStatus;
  score_geral: number;
  criterios: {
    porte_estrutura: IcpCriterionEvaluation;
    faturamento: IcpCriterionEvaluation;
    volume_casos: IcpCriterionEvaluation;
    dores_principais: IcpCriterionEvaluation;
    regiao: IcpCriterionEvaluation;
    maturidade_digital: IcpCriterionEvaluation;
    perfil_decisao: IcpCriterionEvaluation;
  };
  vale_insistir: {
    recomendacao: string;
    condicoes: string[];
    status: 'insistir' | 'despriorizar' | 'avaliar';
  };
  observacoes?: string;
}

export interface ObjectionAnalysisItem {
  categoria: string;
  cliente_citacao_ampliada: string;
  resposta_vendedor_citacao: string;
  avaliacao_resposta: {
    nota: number;
    racional: string;
  };
  resposta_sugerida: {
    texto: string;
    por_que_funciona: string;
  };
  proximo_passo_demo: string;
}

export interface ObjectionKpis {
  total: number;
  tratadas_efetivamente: number;
  score_medio_por_categoria: Record<string, number>;
  principais_lacunas: string[];
}

export interface ObjectionsAnalysisReport {
  lista: ObjectionAnalysisItem[];
  kpis: ObjectionKpis;
}

export interface PracticalSuggestion {
  sugestao: string;
  como_executar: string[];
  impacto?: string;
}

export interface ProximaAcaoRecomendada {
  acao: string;
  prazo: string;
  racional: string;
  condicoes?: string[];
}

export interface MensagemSugerida {
  texto: string;
  por_que_funciona: string;
}

export interface FullAnalysisReport {
  aderencia_ao_script: ScriptAdherenceReport;
  analise_icp: IcpAnalysisReport;
  analise_objecoes: ObjectionsAnalysisReport;
  pontos_positivos: string[];
  pontos_a_melhorar: string[];
  sugestoes_praticas: PracticalSuggestion[];
  resumo_executivo: string;
  proxima_acao_recomendada: ProximaAcaoRecomendada;
  mensagem_sugerida: MensagemSugerida;
  checklist_follow_up: string[];
}
