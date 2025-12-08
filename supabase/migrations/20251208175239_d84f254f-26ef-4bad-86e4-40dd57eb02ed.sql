-- Create email_logs table to track sent collection emails
CREATE TABLE public.email_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conta_receber_id UUID REFERENCES public.contas_receber(id) ON DELETE SET NULL,
  cliente_id UUID NOT NULL,
  email_destino TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'cobranca',
  status TEXT NOT NULL DEFAULT 'enviado',
  erro TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX idx_email_logs_cliente_id ON public.email_logs(cliente_id);
CREATE INDEX idx_email_logs_created_at ON public.email_logs(created_at);
CREATE INDEX idx_email_logs_conta_receber_id ON public.email_logs(conta_receber_id);

-- Enable RLS
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Authenticated users can view email_logs"
ON public.email_logs
FOR SELECT
USING (true);

CREATE POLICY "Only admins can insert email_logs"
ON public.email_logs
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can delete email_logs"
ON public.email_logs
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));