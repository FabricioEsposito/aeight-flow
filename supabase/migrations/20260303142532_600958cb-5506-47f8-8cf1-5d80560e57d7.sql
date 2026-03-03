
-- Create holerites storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('holerites', 'holerites', true);

-- RLS policies for holerites bucket
CREATE POLICY "Authenticated users can upload holerites"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'holerites');

CREATE POLICY "Authenticated users can read holerites"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'holerites');

CREATE POLICY "Authenticated users can update holerites"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'holerites');

CREATE POLICY "Authenticated users can delete holerites"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'holerites');

-- Add holerite_url column to folha_pagamento
ALTER TABLE public.folha_pagamento
ADD COLUMN holerite_url text;
