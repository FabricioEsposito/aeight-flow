-- Add vendedor_id column to profiles table to link users with salesperson role to vendedores
ALTER TABLE public.profiles 
ADD COLUMN vendedor_id uuid REFERENCES public.vendedores(id) ON DELETE SET NULL;

-- Create index for better query performance
CREATE INDEX idx_profiles_vendedor_id ON public.profiles(vendedor_id);