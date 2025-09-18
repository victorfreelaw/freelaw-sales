# 🚀 CONFIGURAÇÃO SUPABASE - FreelawSales

## 📋 Credenciais necessárias

Após criar o projeto no Supabase (https://supabase.com), vá em **Settings > API** e copie:

### 1. Project URL
```
https://SEU_PROJETO_ID.supabase.co
```

### 2. API Keys
- **anon (public)**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
- **service_role**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

### 3. Database URL
```
postgresql://postgres:[SUA_SENHA]@db.SEU_PROJETO_ID.supabase.co:5432/postgres
```

## 🔧 Configure no .env.local

Substitua as linhas fake por:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://SEU_PROJETO_ID.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_anon_key_aqui
SUPABASE_SERVICE_ROLE_KEY=sua_service_role_key_aqui
DATABASE_URL=postgresql://postgres:[SENHA]@db.SEU_PROJETO_ID.supabase.co:5432/postgres
```

## ⚡ Setup automático

Depois de configurar, execute:
```bash
node scripts/setup-supabase.js
```

Isso vai:
- ✅ Testar conexão
- ✅ Instalar extensão pgvector
- ✅ Criar tabelas RAG
- ✅ Configurar índices otimizados
- ✅ Testar funcionalidade

## 🧪 Testar tudo

```bash
node scripts/test-config.js
curl http://localhost:3000/api/test-rag-system
```

## 📊 O que será criado

### Tabelas principais:
- `transcript_chunks` - Chunks com embeddings para RAG
- `rag_analysis_cache` - Cache de análises otimizado

### Funções SQL:
- `search_transcript_chunks()` - Busca semântica
- `get_chunks_by_time_range()` - Busca temporal
- `get_chunks_by_speaker()` - Busca por speaker
- `cleanup_expired_cache()` - Limpeza automática

## 🎯 Vantagens

✅ **Banco unificado**: Dados + RAG no mesmo lugar
✅ **Performance**: pgvector nativo do Postgres
✅ **Escalabilidade**: Supabase gerencia tudo
✅ **Custo**: Tier gratuito generoso
✅ **Backup**: Automático
✅ **API**: REST + GraphQL automáticas