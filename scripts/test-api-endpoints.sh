#!/bin/bash

echo "🧪 Testando endpoints da API com Supabase..."

# URL base da aplicação
BASE_URL="http://localhost:3000"

echo ""
echo "1️⃣ Testando endpoint de saúde..."
curl -s "$BASE_URL/api/health" | jq '.' 2>/dev/null || echo "Endpoint de saúde não disponível"

echo ""
echo "2️⃣ Testando webhook N8N..."
curl -s -X POST "$BASE_URL/api/webhooks/n8n" \
  -H "Content-Type: application/json" \
  -d '{
    "test": true,
    "message": "Teste de integração Supabase"
  }' | jq '.' 2>/dev/null || echo "Response: $(curl -s -X POST "$BASE_URL/api/webhooks/n8n" -H "Content-Type: application/json" -d '{"test": true}')"

echo ""
echo "3️⃣ Verificando se o dev server está rodando..."
if curl -s "$BASE_URL" > /dev/null; then
    echo "✅ Servidor está rodando em $BASE_URL"
else
    echo "❌ Servidor não está acessível"
fi

echo ""
echo "4️⃣ Verificando variáveis Supabase..."
if [ -n "$NEXT_PUBLIC_SUPABASE_URL" ]; then
    echo "✅ SUPABASE_URL configurada: ${NEXT_PUBLIC_SUPABASE_URL:0:30}..."
else
    echo "❌ SUPABASE_URL não configurada"
fi

if [ -n "$SUPABASE_SERVICE_ROLE_KEY" ]; then
    echo "✅ SERVICE_ROLE_KEY configurada: ${SUPABASE_SERVICE_ROLE_KEY:0:30}..."
else
    echo "❌ SERVICE_ROLE_KEY não configurada"
fi

echo ""
echo "✅ Teste de configuração concluído!"