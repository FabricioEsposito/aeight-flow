-- Add cargo and contato to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS cargo TEXT,
ADD COLUMN IF NOT EXISTS contato TEXT;

-- Create table for hierarchy change requests
CREATE TABLE IF NOT EXISTS public.hierarchy_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  requested_role app_role NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  approved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  approved_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.hierarchy_requests ENABLE ROW LEVEL SECURITY;

-- Policies for hierarchy_requests
CREATE POLICY "Users can view their own requests"
ON public.hierarchy_requests
FOR SELECT
USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can create their own requests"
ON public.hierarchy_requests
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can update requests"
ON public.hierarchy_requests
FOR UPDATE
USING (has_role(auth.uid(), 'admin'));

-- Trigger for updated_at
CREATE TRIGGER update_hierarchy_requests_updated_at
BEFORE UPDATE ON public.hierarchy_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();