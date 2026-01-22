-- 1) Multi-centro de custo por vendedor: tabela de vínculo
create table if not exists public.vendedores_centros_custo (
  id uuid primary key default gen_random_uuid(),
  vendedor_id uuid not null references public.vendedores(id) on delete cascade,
  centro_custo_id uuid not null references public.centros_custo(id) on delete restrict,
  meta numeric not null default 0,
  percentual_comissao numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (vendedor_id, centro_custo_id)
);

-- Trigger updated_at
create trigger update_vendedores_centros_custo_updated_at
before update on public.vendedores_centros_custo
for each row execute function public.update_updated_at_column();

-- Enable RLS
alter table public.vendedores_centros_custo enable row level security;

-- Policies
-- Select: autenticados
create policy "Authenticated users can view vendedores_centros_custo"
on public.vendedores_centros_custo
for select
to authenticated
using (true);

-- Insert/Update/Delete: admin + finance_manager + commercial_manager (cadastro)
create policy "Commercial and admin roles can create vendedores_centros_custo"
on public.vendedores_centros_custo
for insert
to authenticated
with check (public.has_any_role(auth.uid(), array['admin'::public.app_role,'finance_manager'::public.app_role,'commercial_manager'::public.app_role]));

create policy "Commercial and admin roles can update vendedores_centros_custo"
on public.vendedores_centros_custo
for update
to authenticated
using (public.has_any_role(auth.uid(), array['admin'::public.app_role,'finance_manager'::public.app_role,'commercial_manager'::public.app_role]));

create policy "Commercial and admin roles can delete vendedores_centros_custo"
on public.vendedores_centros_custo
for delete
to authenticated
using (public.has_any_role(auth.uid(), array['admin'::public.app_role,'finance_manager'::public.app_role,'commercial_manager'::public.app_role]));

-- 2) Colunas de merge em vendedores (para esconder duplicados e rastrear histórico)
alter table public.vendedores
  add column if not exists is_merged boolean not null default false;

alter table public.vendedores
  add column if not exists merged_into_vendedor_id uuid null references public.vendedores(id);

create index if not exists idx_vendedores_is_merged on public.vendedores(is_merged);
create index if not exists idx_vendedores_merged_into on public.vendedores(merged_into_vendedor_id);

-- 3) Ajuste de RLS: comissão NÃO deve ser aprovada por commercial_manager
-- Remover policies antigas e recriar com admin + finance_manager

-- Drop (se existirem) com nomes atuais do schema
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='solicitacoes_comissao' AND policyname='Managers can update commission requests'
  ) THEN
    EXECUTE 'drop policy "Managers can update commission requests" on public.solicitacoes_comissao';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='solicitacoes_comissao' AND policyname='Role-based commission request viewing'
  ) THEN
    EXECUTE 'drop policy "Role-based commission request viewing" on public.solicitacoes_comissao';
  END IF;
END $$;

create policy "Finance/Admin can update commission requests"
on public.solicitacoes_comissao
for update
to authenticated
using (public.has_any_role(auth.uid(), array['admin'::public.app_role,'finance_manager'::public.app_role]));

create policy "Role-based commission request viewing v2"
on public.solicitacoes_comissao
for select
to authenticated
using (
  public.has_any_role(auth.uid(), array['admin'::public.app_role,'finance_manager'::public.app_role])
  OR auth.uid() = solicitante_id
);

-- 4) Migração: popular tabela de vínculo a partir do modelo antigo (vendedores.centro_custo)
-- Resolve centro_custo (varchar) para UUID:
-- - se for UUID, usa direto
-- - senão tenta mapear por centros_custo.codigo
DO $$
DECLARE
  r record;
  cc_id uuid;
BEGIN
  FOR r IN
    SELECT id as vendedor_id, centro_custo, meta, percentual_comissao
    FROM public.vendedores
    WHERE centro_custo is not null and btrim(centro_custo) <> ''
  LOOP
    cc_id := NULL;

    -- Try cast as UUID
    BEGIN
      cc_id := r.centro_custo::uuid;
    EXCEPTION WHEN others THEN
      cc_id := NULL;
    END;

    -- Fallback to codigo
    IF cc_id IS NULL THEN
      SELECT c.id INTO cc_id
      FROM public.centros_custo c
      WHERE c.codigo = r.centro_custo
      LIMIT 1;
    END IF;

    IF cc_id IS NOT NULL THEN
      INSERT INTO public.vendedores_centros_custo (vendedor_id, centro_custo_id, meta, percentual_comissao)
      VALUES (r.vendedor_id, cc_id, COALESCE(r.meta,0), COALESCE(r.percentual_comissao,0))
      ON CONFLICT (vendedor_id, centro_custo_id)
      DO UPDATE SET
        meta = EXCLUDED.meta,
        percentual_comissao = EXCLUDED.percentual_comissao,
        updated_at = now();
    END IF;
  END LOOP;
END $$;

-- 5) Migração: unificar vendedores duplicados por (nome + fornecedor_id)
-- Canon: menor created_at (e, em empate, menor id)
DO $$
DECLARE
  grp record;
  canon_id uuid;
  dup record;
BEGIN
  FOR grp IN
    SELECT lower(btrim(nome)) as nome_key,
           fornecedor_id,
           count(*) as qtd
    FROM public.vendedores
    WHERE status = 'ativo'
      AND is_merged = false
    GROUP BY 1,2
    HAVING count(*) > 1
  LOOP
    SELECT v.id INTO canon_id
    FROM public.vendedores v
    WHERE lower(btrim(v.nome)) = grp.nome_key
      AND ((v.fornecedor_id is null AND grp.fornecedor_id is null) OR v.fornecedor_id = grp.fornecedor_id)
      AND v.is_merged = false
    ORDER BY v.created_at asc nulls last, v.id asc
    LIMIT 1;

    -- Merge others into canon
    FOR dup IN
      SELECT v.*
      FROM public.vendedores v
      WHERE lower(btrim(v.nome)) = grp.nome_key
        AND ((v.fornecedor_id is null AND grp.fornecedor_id is null) OR v.fornecedor_id = grp.fornecedor_id)
        AND v.id <> canon_id
        AND v.is_merged = false
    LOOP
      -- move vendor->centro links
      INSERT INTO public.vendedores_centros_custo (vendedor_id, centro_custo_id, meta, percentual_comissao)
      SELECT canon_id, vcc.centro_custo_id, vcc.meta, vcc.percentual_comissao
      FROM public.vendedores_centros_custo vcc
      WHERE vcc.vendedor_id = dup.id
      ON CONFLICT (vendedor_id, centro_custo_id)
      DO UPDATE SET
        meta = GREATEST(public.vendedores_centros_custo.meta, EXCLUDED.meta),
        percentual_comissao = GREATEST(public.vendedores_centros_custo.percentual_comissao, EXCLUDED.percentual_comissao),
        updated_at = now();

      -- update references
      UPDATE public.profiles p
      SET vendedor_id = canon_id
      WHERE p.vendedor_id = dup.id;

      UPDATE public.solicitacoes_comissao sc
      SET vendedor_id = canon_id
      WHERE sc.vendedor_id = dup.id;

      -- contratos.vendedor_responsavel é varchar: atualizar quando for UUID igual ao dup.id
      UPDATE public.contratos c
      SET vendedor_responsavel = canon_id::text
      WHERE c.vendedor_responsavel = dup.id::text;

      -- mark merged
      UPDATE public.vendedores
      SET is_merged = true,
          merged_into_vendedor_id = canon_id,
          status = 'inativo',
          updated_at = now()
      WHERE id = dup.id;
    END LOOP;
  END LOOP;
END $$;
