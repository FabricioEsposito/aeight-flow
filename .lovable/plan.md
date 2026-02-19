

# Chat com IA na area do DRE

## Objetivo
Criar um chat interativo com IA integrado a aba de DRE no Dashboard. O chat recebera automaticamente os dados financeiros do DRE atual como contexto e permitira ao usuario fazer perguntas sobre o negocio, receber orientacoes sobre investimentos, identificar areas de melhoria e obter recomendacoes estrategicas.

## Como vai funcionar

1. Um botao "Consultar IA" abrira um painel de chat ao lado do DRE
2. A IA ja recebera automaticamente todos os dados do DRE como contexto (receita, custos, margens, EBITDA, etc.)
3. O usuario podera perguntar livremente, por exemplo:
   - "Onde devo investir mais dinheiro?"
   - "Quais areas estao com custo alto?"
   - "Como posso melhorar minha margem?"
   - "Meu resultado esta saudavel?"
4. As respostas serao exibidas em tempo real com streaming (token por token)

## Implementacao Tecnica

### 1. Nova Edge Function: `chat-dre`
- Recebera os dados do DRE como contexto + historico de mensagens do usuario
- System prompt configurado como analista financeiro especializado em empresas brasileiras
- Usara o Lovable AI Gateway com modelo `google/gemini-3-flash-preview`
- Suportara streaming SSE para respostas em tempo real
- Tratamento de erros 429 (rate limit) e 402 (creditos)

### 2. Novo Componente: `DREChatDialog.tsx`
- Dialog/Sheet lateral que abre sobre o DRE
- Campo de input para digitar perguntas
- Historico de mensagens (usuario e IA)
- Renderizacao de respostas com markdown (`react-markdown` nao esta instalado, sera usado formatacao basica com whitespace pre-wrap)
- Indicador de loading durante streaming
- Os dados do DRE sao enviados automaticamente como contexto na primeira mensagem

### 3. Integracao no `DREAnalysis.tsx`
- Adicionar botao "Consultar IA" no header do card do DRE
- Passar os dados calculados do DRE para o componente de chat

### Arquivos a criar/modificar

| Arquivo | Acao |
|---------|------|
| `supabase/functions/chat-dre/index.ts` | Criar - Edge function com streaming |
| `supabase/config.toml` | Modificar - Registrar nova funcao |
| `src/components/dashboard/DREChatDialog.tsx` | Criar - Componente de chat |
| `src/components/dashboard/DREAnalysis.tsx` | Modificar - Adicionar botao e integrar chat |

### Fluxo de dados

1. `DREAnalysis` calcula os dados financeiros
2. Usuario clica em "Consultar IA"
3. `DREChatDialog` abre com os dados do DRE pre-carregados
4. Ao enviar mensagem, o frontend faz streaming via SSE para `chat-dre`
5. A edge function envia os dados do DRE como system prompt + mensagens do usuario para o Lovable AI Gateway
6. Tokens sao renderizados em tempo real no chat

