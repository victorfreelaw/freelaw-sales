# 🔗 Configuração N8N - FreelawSales

Este guia mostra como configurar o N8N para enviar dados de transcrição para o FreelawSales.

## 🎯 Endpoint da API

```
POST https://seu-dominio.vercel.app/api/webhooks/n8n
```

## 🔐 Autenticação

### 1. Configurar Variável de Ambiente

Adicione no seu `.env.local`:

```bash
N8N_WEBHOOK_SECRET=seu_token_super_secreto_aqui_123456
```

### 2. Header de Autenticação no N8N

```
Authorization: Bearer seu_token_super_secreto_aqui_123456
```

## 📋 Configuração Passo a Passo no N8N

### Passo 1: Criar HTTP Request Node
1. Adicione um nó **HTTP Request**
2. Configure:
   - **Method**: `POST`
   - **URL**: `https://seu-dominio.vercel.app/api/webhooks/n8n`

### Passo 2: Configurar Headers
No nó HTTP Request, na aba **Headers**:

```json
{
  "Content-Type": "application/json",
  "Authorization": "Bearer seu_token_super_secreto_aqui_123456"
}
```

### Passo 3: Configurar Body
Na aba **Body**, selecione **JSON** e use este template:

```json
{
  "meetingTitle": "{{ $json.meeting_title }}",
  "sellerName": "{{ $json.seller_name }}",
  "sellerEmail": "{{ $json.seller_email }}",
  "meetingDate": "{{ $json.meeting_date }}",
  "recordingUrl": "{{ $json.recording_url }}",
  "transcript": {
    "rawText": "{{ $json.transcript_text }}",
    "language": "pt-BR",
    "duration": {{ $json.duration_seconds }},
    "segments": {{ $json.transcript_segments }}
  },
  "participants": [
    {
      "name": "{{ $json.seller_name }}",
      "email": "{{ $json.seller_email }}",
      "role": "seller"
    },
    {
      "name": "{{ $json.prospect_name }}",
      "email": "{{ $json.prospect_email }}",
      "role": "prospect"
    }
  ],
  "metadata": {
    "source": "n8n",
    "platform": "{{ $json.platform }}",
    "externalId": "{{ $json.external_id }}"
  }
}
```

## 📋 Campos Obrigatórios

| Campo | Tipo | Descrição | Exemplo |
|-------|------|-----------|---------|
| `meetingTitle` | string | Título da reunião | "Reunião de Discovery - Empresa ABC" |
| `sellerName` | string | Nome do vendedor | "João Silva" |
| `sellerEmail` | string | Email do vendedor | "joao@freelaw.com" |
| `meetingDate` | string | Data em formato ISO | "2024-01-15T14:30:00Z" |
| `recordingUrl` | string | URL da gravação | "https://zoom.us/rec/share/..." |
| `transcript.rawText` | string | Texto da transcrição | "Olá, como está?..." |

## 📋 Campos Opcionais

### Segmentos de Transcrição
```json
"segments": [
  {
    "speaker": "João Silva",
    "text": "Olá, tudo bem?",
    "start": 0,
    "end": 3.5,
    "confidence": 0.95
  },
  {
    "speaker": "Cliente",
    "text": "Olá, tudo ótimo!",
    "start": 4.0,
    "end": 6.2,
    "confidence": 0.92
  }
]
```

### Participantes
```json
"participants": [
  {
    "name": "João Silva",
    "email": "joao@freelaw.com",
    "role": "seller"
  },
  {
    "name": "Maria Santos",
    "email": "maria@empresa.com",
    "role": "prospect"
  }
]
```

## 🔧 Exemplo Completo de Payload

```json
{
  "meetingTitle": "Reunião de Discovery - Empresa ABC",
  "sellerName": "João Silva",
  "sellerEmail": "joao@freelaw.com",
  "meetingDate": "2024-01-15T14:30:00Z",
  "recordingUrl": "https://zoom.us/rec/share/abc123",
  "transcript": {
    "rawText": "João Silva: Olá, tudo bem? Como está o seu dia?\nCliente: Olá João, tudo ótimo! Estou animado para nossa conversa.\nJoão Silva: Que bom! Vamos começar então...",
    "language": "pt-BR",
    "duration": 1800,
    "segments": [
      {
        "speaker": "João Silva",
        "text": "Olá, tudo bem? Como está o seu dia?",
        "start": 0,
        "end": 3.5,
        "confidence": 0.95
      },
      {
        "speaker": "Cliente",
        "text": "Olá João, tudo ótimo! Estou animado para nossa conversa.",
        "start": 4.0,
        "end": 8.2,
        "confidence": 0.92
      }
    ]
  },
  "participants": [
    {
      "name": "João Silva",
      "email": "joao@freelaw.com",
      "role": "seller"
    },
    {
      "name": "Maria Santos",
      "email": "maria@empresaabc.com",
      "role": "prospect"
    }
  ],
  "metadata": {
    "source": "n8n",
    "platform": "zoom",
    "externalId": "zoom_meeting_123456"
  }
}
```

## ✅ Respostas da API

### Sucesso (200)
```json
{
  "success": true,
  "meetingId": "cm123abc...",
  "transcriptId": "cm456def...",
  "message": "Transcrição processada com sucesso"
}
```

### Erro de Validação (400)
```json
{
  "error": "Dados inválidos",
  "details": [
    {
      "path": ["sellerEmail"],
      "message": "Email do vendedor deve ser válido"
    }
  ]
}
```

### Erro de Autenticação (401)
```json
{
  "error": "Unauthorized"
}
```

## 🧪 Testando a Integração

### 1. Teste Manual via cURL
```bash
curl -X POST https://seu-dominio.vercel.app/api/webhooks/n8n \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer seu_token_super_secreto_aqui_123456" \
  -d '{
    "meetingTitle": "Teste N8N Integration",
    "sellerName": "João Teste",
    "sellerEmail": "joao@teste.com",
    "meetingDate": "2024-01-15T14:30:00Z",
    "recordingUrl": "https://example.com/recording",
    "transcript": {
      "rawText": "Esta é uma transcrição de teste para verificar a integração com N8N."
    }
  }'
```

### 2. Verificar Logs
- No FreelawSales, vá para a página de reuniões
- Verifique se a nova reunião foi criada
- Confira se a análise foi processada

## 🔍 Troubleshooting

### Erro 401 - Unauthorized
- Verifique se o header `Authorization` está correto
- Confirme se a variável `N8N_WEBHOOK_SECRET` está configurada

### Erro 400 - Dados Inválidos
- Verifique se todos os campos obrigatórios estão presentes
- Confirme se os formatos de data e email estão corretos
- Use o formato ISO para datas: `YYYY-MM-DDTHH:mm:ssZ`

### Erro 500 - Erro Interno
- Verifique os logs do servidor
- Confirme se o banco de dados está acessível
- Verifique se as variáveis de ambiente estão configuradas

## 📊 Monitoramento

A API registra automaticamente:
- ✅ Webhooks recebidos com sucesso
- ❌ Erros de validação e processamento
- 📈 Métricas de performance
- 🔐 Tentativas de acesso não autorizadas

Você pode monitorar esses eventos na interface de telemetria do FreelawSales.