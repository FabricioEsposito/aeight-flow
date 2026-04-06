

## Plano: Área de Documentos do Contador (Upload de Extratos Bancários)

### Resumo
Adicionar uma terceira aba na Área do Contador chamada **"Documentos"**, onde o admin/financeiro pode fazer upload de extratos bancários (PDFs, planilhas) organizados por conta bancária e mês, e o contador pode visualizar e fazer download desses arquivos.

---

### 1. Criar bucket de storage `contador-docs`

**Migration SQL:**
```sql
INSERT INTO storage.buckets (id, name, public) 
VALUES ('contador-docs', 'contador-docs', false);
```

RLS policies no `storage.objects`:
- **SELECT**: usuários autenticados com roles `admin`, `finance_manager`, `finance_analyst`, ou `contador`
- **INSERT/UPDATE/DELETE**: apenas `admin`, `finance_manager`, `finance_analyst`

### 2. Criar tabela `contador_documentos`

**Migration SQL** para registrar metadados dos arquivos:

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | uuid PK | |
| nome_arquivo | text | Nome original do arquivo |
| storage_path | text | Caminho no bucket |
| conta_bancaria_id | uuid | Conta bancária relacionada |
| mes_referencia | integer | Mês (1-12) |
| ano_referencia | integer | Ano |
| descricao | text (nullable) | Observação opcional |
| uploaded_by | uuid | Quem fez o upload |
| created_at | timestamptz | |

RLS:
- **SELECT**: roles `admin`, `finance_manager`, `finance_analyst`, `contador`
- **INSERT/DELETE**: roles `admin`, `finance_manager`, `finance_analyst`

### 3. Adicionar aba "Documentos" na página AreaContador

**Arquivo:** `src/pages/AreaContador.tsx`

- Nova `TabsTrigger` com ícone `FileText` e label "Documentos"
- Componente `DocumentosTab` com:
  - **Filtros**: conta bancária, mês/ano de referência
  - **Tabela**: Nome do arquivo, Conta Bancária, Mês/Ano, Data do upload, Ações (download)
  - **Botão de upload** (visível apenas para admin/finance): selecionar arquivo, escolher conta bancária e mês/ano, fazer upload para o bucket `contador-docs` e salvar registro na tabela
  - **Download**: usa `openStorageFile` (URL assinada) para arquivos privados

### 4. Lógica de upload e download

- Upload: `supabase.storage.from('contador-docs').upload(path, file)` com path no formato `{ano}/{mes}/{conta_bancaria_id}/{filename}`
- Download: reutilizar `openStorageFile` existente em `src/lib/storage-utils.ts`
- Deletar: admin pode remover arquivos (remove do storage + deleta registro da tabela)

---

### Detalhes Técnicos

- O contador terá acesso somente leitura (visualizar e baixar) — sem botões de upload ou exclusão
- Admin e finance_manager verão botões de upload e exclusão
- A verificação de permissão usará `useUserRole` para condicionar a UI
- Arquivos aceitos: PDF, XLS, XLSX, CSV, OFX

