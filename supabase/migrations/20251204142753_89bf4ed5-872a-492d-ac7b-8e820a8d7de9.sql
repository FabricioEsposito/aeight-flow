-- Criar tabela de notificações para usuários
CREATE TABLE public.notificacoes (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    titulo TEXT NOT NULL,
    mensagem TEXT NOT NULL,
    tipo TEXT NOT NULL DEFAULT 'info', -- 'aprovado', 'rejeitado', 'info'
    lida BOOLEAN NOT NULL DEFAULT false,
    referencia_id UUID, -- ID da solicitação relacionada
    referencia_tipo TEXT, -- 'solicitacao_ajuste'
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.notificacoes ENABLE ROW LEVEL SECURITY;

-- Política para usuários verem suas próprias notificações
CREATE POLICY "Usuários podem ver suas próprias notificações"
ON public.notificacoes
FOR SELECT
USING (auth.uid() = user_id);

-- Política para usuários atualizarem suas próprias notificações (marcar como lida)
CREATE POLICY "Usuários podem atualizar suas próprias notificações"
ON public.notificacoes
FOR UPDATE
USING (auth.uid() = user_id);

-- Política para admins criarem notificações
CREATE POLICY "Admins podem criar notificações"
ON public.notificacoes
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Política para usuários deletarem suas próprias notificações
CREATE POLICY "Usuários podem deletar suas próprias notificações"
ON public.notificacoes
FOR DELETE
USING (auth.uid() = user_id);

-- Índice para performance
CREATE INDEX idx_notificacoes_user_id ON public.notificacoes(user_id);
CREATE INDEX idx_notificacoes_lida ON public.notificacoes(user_id, lida);