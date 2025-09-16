# FreelawSales - Setup Guide

Este guia te ajudará a rodar o FreelawSales localmente para desenvolvimento.

## 🚀 Quick Start

### 1. Instalar Dependências
```bash
npm install
```

### 2. Configurar Variáveis de Ambiente

Copie o arquivo de exemplo e configure suas variáveis:
```bash
cp .env.example .env.local
```

Edite `.env.local` com suas configurações:

```bash
# Application
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Supabase (obrigatório)
NEXT_PUBLIC_SUPABASE_URL=sua_url_do_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_chave_anonima
SUPABASE_SERVICE_ROLE_KEY=sua_chave_de_servico

# Database (obrigatório)
DATABASE_URL=postgresql://username:password@host:port/database

# LLM Provider (obrigatório para análises)
OPENAI_API_KEY=sua_chave_openai

# Integrações (opcionais)
FATHOM_WEBHOOK_SECRET=seu_secret_webhook_fathom
FATHOM_API_KEY=sua_chave_api_fathom
HUBSPOT_PRIVATE_APP_TOKEN=seu_token_hubspot
SLACK_BOT_TOKEN=seu_token_slack_bot
```

### 3. Setup do Banco de Dados

Se você ainda não tem um banco Supabase, crie um projeto em [supabase.com](https://supabase.com).

Executar migrations:
```bash
npm run db:push
```

Ou gerar migrations:
```bash
npm run db:generate
npm run db:migrate
```

### 4. Executar em Desenvolvimento

```bash
npm run dev
```

O app estará disponível em http://localhost:3000

## 📋 Funcionalidades Principais

### ✅ Já Implementadas
- **Dashboard** com KPIs e métricas
- **Lista de Reuniões** com busca e filtros
- **Detalhes da Reunião** com transcrição e análise completa
- **Webhook Fathom** para ingestão automática
- **Análise LLM** (script adherence + ICP fit + highlights)
- **Integração HubSpot** para sync com CRM
- **Sistema de Telemetria** para monitoramento
- **Auth & RLS** com Supabase

### 🔧 Como Testar

1. **Login**: Acesse `/auth/login` (você precisará criar usuários no Supabase)
2. **Dashboard**: Visualize métricas gerais em `/dashboard`
3. **Reuniões**: Lista completa em `/meetings`
4. **Webhook**: Teste com `POST /api/webhooks/fathom` (precisa da signature)

### 🎯 Dados de Teste

Para testar localmente, você pode:

1. **Criar usuários** diretamente no Supabase Auth
2. **Inserir reuniões** via webhook ou diretamente no banco
3. **Processar análises** via `/api/analysis/process`

## 🛠 Scripts Disponíveis

```bash
# Desenvolvimento
npm run dev          # Inicia servidor de desenvolvimento
npm run build        # Build de produção
npm run start        # Inicia servidor de produção

# Database
npm run db:generate  # Gera migrations do Drizzle
npm run db:migrate   # Aplica migrations
npm run db:push      # Push schema direto (dev only)
npm run db:studio    # Interface visual do banco

# Testes
npm run test         # Testes unitários (Vitest)
npm run test:e2e     # Testes E2E (Playwright)

# Linting
npm run lint         # ESLint
```

## 🔐 Configuração de Integrações

### Fathom
1. No Fathom, configure webhook para `{sua_url}/api/webhooks/fathom`
2. Configure o secret no `.env.local`
3. As reuniões serão processadas automaticamente

### HubSpot
1. Crie um Private App no HubSpot
2. Adicione permissões para Contacts, Companies, Deals, Notes
3. Configure o token no `.env.local`

### Slack (Opcional)
1. Crie um Slack App
2. Configure Bot Token Scopes: `chat:write`, `channels:read`
3. Configure o token no `.env.local`

## 🐛 Troubleshooting

### Erro de Database
- Verifique se o `DATABASE_URL` está correto
- Execute `npm run db:push` para sincronizar schema

### Erro de Auth
- Verifique URLs e chaves do Supabase
- Confirme se RLS está configurado corretamente

### Erro de LLM
- Verifique se `OPENAI_API_KEY` está configurada
- Teste com `GET /api/analysis/process`

## 📱 Design System

O FreelawSales usa um design system corporativo e profissional:

- **Cores**: Tons sóbrios com accent em azul escuro
- **Tipografia**: Geist Sans para texto, Geist Mono para código
- **Componentes**: shadcn/ui customizados
- **Acessibilidade**: WCAG 2.1 AA compliance
- **Dark Mode**: Totalmente suportado

## 🚀 Deploy

O projeto está otimizado para deploy na Vercel:

1. Conecte seu repo no Vercel
2. Configure as variáveis de ambiente
3. Deploy automático a cada push

---

**Dúvidas?** Verifique os logs no console ou consulte a documentação dos componentes individuais.