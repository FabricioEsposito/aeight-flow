-- Drop existing overly permissive policies and create new role-based policies
-- Pattern: READ and INSERT for all authenticated users, UPDATE and DELETE for admins only

-- =====================
-- CLIENTES TABLE
-- =====================
DROP POLICY IF EXISTS "Authenticated users can delete clientes" ON public.clientes;
DROP POLICY IF EXISTS "Authenticated users can insert clientes" ON public.clientes;
DROP POLICY IF EXISTS "Authenticated users can update clientes" ON public.clientes;
DROP POLICY IF EXISTS "Authenticated users can view clientes" ON public.clientes;

-- All authenticated users can read
CREATE POLICY "Authenticated users can view clientes" 
ON public.clientes 
FOR SELECT 
TO authenticated
USING (true);

-- All authenticated users can create
CREATE POLICY "Authenticated users can create clientes" 
ON public.clientes 
FOR INSERT 
TO authenticated
WITH CHECK (true);

-- Only admins can update
CREATE POLICY "Only admins can update clientes" 
ON public.clientes 
FOR UPDATE 
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Only admins can delete
CREATE POLICY "Only admins can delete clientes" 
ON public.clientes 
FOR DELETE 
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- =====================
-- FORNECEDORES TABLE
-- =====================
DROP POLICY IF EXISTS "Allow all operations on fornecedores" ON public.fornecedores;

CREATE POLICY "Authenticated users can view fornecedores" 
ON public.fornecedores 
FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can create fornecedores" 
ON public.fornecedores 
FOR INSERT 
TO authenticated
WITH CHECK (true);

CREATE POLICY "Only admins can update fornecedores" 
ON public.fornecedores 
FOR UPDATE 
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can delete fornecedores" 
ON public.fornecedores 
FOR DELETE 
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- =====================
-- CONTRATOS TABLE
-- =====================
DROP POLICY IF EXISTS "Allow all operations on contratos" ON public.contratos;

CREATE POLICY "Authenticated users can view contratos" 
ON public.contratos 
FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can create contratos" 
ON public.contratos 
FOR INSERT 
TO authenticated
WITH CHECK (true);

CREATE POLICY "Only admins can update contratos" 
ON public.contratos 
FOR UPDATE 
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can delete contratos" 
ON public.contratos 
FOR DELETE 
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- =====================
-- CONTAS_PAGAR TABLE
-- =====================
DROP POLICY IF EXISTS "Allow all operations on contas_pagar" ON public.contas_pagar;

CREATE POLICY "Authenticated users can view contas_pagar" 
ON public.contas_pagar 
FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can create contas_pagar" 
ON public.contas_pagar 
FOR INSERT 
TO authenticated
WITH CHECK (true);

CREATE POLICY "Only admins can update contas_pagar" 
ON public.contas_pagar 
FOR UPDATE 
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can delete contas_pagar" 
ON public.contas_pagar 
FOR DELETE 
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- =====================
-- CONTAS_RECEBER TABLE
-- =====================
DROP POLICY IF EXISTS "Allow all operations on contas_receber" ON public.contas_receber;

CREATE POLICY "Authenticated users can view contas_receber" 
ON public.contas_receber 
FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can create contas_receber" 
ON public.contas_receber 
FOR INSERT 
TO authenticated
WITH CHECK (true);

CREATE POLICY "Only admins can update contas_receber" 
ON public.contas_receber 
FOR UPDATE 
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can delete contas_receber" 
ON public.contas_receber 
FOR DELETE 
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- =====================
-- MOVIMENTACOES TABLE
-- =====================
DROP POLICY IF EXISTS "Allow all operations on movimentacoes" ON public.movimentacoes;

CREATE POLICY "Authenticated users can view movimentacoes" 
ON public.movimentacoes 
FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can create movimentacoes" 
ON public.movimentacoes 
FOR INSERT 
TO authenticated
WITH CHECK (true);

CREATE POLICY "Only admins can update movimentacoes" 
ON public.movimentacoes 
FOR UPDATE 
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can delete movimentacoes" 
ON public.movimentacoes 
FOR DELETE 
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- =====================
-- CONTAS_BANCARIAS TABLE
-- =====================
DROP POLICY IF EXISTS "Allow all operations on contas_bancarias" ON public.contas_bancarias;

CREATE POLICY "Authenticated users can view contas_bancarias" 
ON public.contas_bancarias 
FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can create contas_bancarias" 
ON public.contas_bancarias 
FOR INSERT 
TO authenticated
WITH CHECK (true);

CREATE POLICY "Only admins can update contas_bancarias" 
ON public.contas_bancarias 
FOR UPDATE 
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can delete contas_bancarias" 
ON public.contas_bancarias 
FOR DELETE 
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- =====================
-- CENTROS_CUSTO TABLE
-- =====================
DROP POLICY IF EXISTS "Allow all operations on centros_custo" ON public.centros_custo;

CREATE POLICY "Authenticated users can view centros_custo" 
ON public.centros_custo 
FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can create centros_custo" 
ON public.centros_custo 
FOR INSERT 
TO authenticated
WITH CHECK (true);

CREATE POLICY "Only admins can update centros_custo" 
ON public.centros_custo 
FOR UPDATE 
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can delete centros_custo" 
ON public.centros_custo 
FOR DELETE 
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- =====================
-- PLANO_CONTAS TABLE
-- =====================
DROP POLICY IF EXISTS "Allow all operations on plano_contas" ON public.plano_contas;

CREATE POLICY "Authenticated users can view plano_contas" 
ON public.plano_contas 
FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can create plano_contas" 
ON public.plano_contas 
FOR INSERT 
TO authenticated
WITH CHECK (true);

CREATE POLICY "Only admins can update plano_contas" 
ON public.plano_contas 
FOR UPDATE 
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can delete plano_contas" 
ON public.plano_contas 
FOR DELETE 
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- =====================
-- SERVICOS TABLE
-- =====================
DROP POLICY IF EXISTS "Allow all operations on servicos" ON public.servicos;

CREATE POLICY "Authenticated users can view servicos" 
ON public.servicos 
FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can create servicos" 
ON public.servicos 
FOR INSERT 
TO authenticated
WITH CHECK (true);

CREATE POLICY "Only admins can update servicos" 
ON public.servicos 
FOR UPDATE 
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can delete servicos" 
ON public.servicos 
FOR DELETE 
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- =====================
-- PARCELAS_CONTRATO TABLE
-- =====================
DROP POLICY IF EXISTS "Allow all operations on parcelas_contrato" ON public.parcelas_contrato;

CREATE POLICY "Authenticated users can view parcelas_contrato" 
ON public.parcelas_contrato 
FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can create parcelas_contrato" 
ON public.parcelas_contrato 
FOR INSERT 
TO authenticated
WITH CHECK (true);

CREATE POLICY "Only admins can update parcelas_contrato" 
ON public.parcelas_contrato 
FOR UPDATE 
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can delete parcelas_contrato" 
ON public.parcelas_contrato 
FOR DELETE 
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));