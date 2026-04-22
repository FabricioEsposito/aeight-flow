// Tests para o bloco "Dados para Pagamento" do e-mail de FATURAMENTO.
// Cobre contas mapeadas (Matriz/Filial b8one, Lomadee, Cryah) e não mapeadas,
// além das formas de pagamento PIX e Transferência.

import {
  assert,
  assertEquals,
  assertStringIncludes,
} from "https://deno.land/std@0.224.0/assert/mod.ts";

// ---- Helpers (cópia idêntica das funções em index.ts para teste isolado) ----

interface DadosBancarios {
  banco: string;
  agencia: string | null;
  conta: string | null;
  tipo_conta: string | null;
  descricao: string;
}

function resolveTitularPJ(descricaoConta: string): { razao_social: string; cnpj: string } | null {
  if (!descricaoConta) return null;
  const desc = descricaoConta.toLowerCase().trim();

  if (desc.endsWith("matriz b8one") || desc.endsWith("conta garantia b8one")) {
    return { razao_social: "B8ONE CONSULTORIA TECNICA EM TI LTDA", cnpj: "31.044.681/0001-13" };
  }
  if (desc.endsWith("filial b8one")) {
    return { razao_social: "B8ONE CONSULTORIA TECNICA EM TI LTDA", cnpj: "31.044.681/0002-02" };
  }
  if (desc.endsWith("matriz lomadee")) {
    return { razao_social: "PLUGONE CONSULTORIA TECNICA EM TI LTDA", cnpj: "38.442.433/0001-70" };
  }
  if (desc.endsWith("matriz cryah")) {
    return { razao_social: "CRYAH AGENCIA DIGITAL LTDA", cnpj: "12.104.320/0001-70" };
  }
  return null;
}

function tipoContaLabel(tipo: string | null): string {
  if (tipo === "corrente") return "Conta Corrente";
  if (tipo === "poupanca") return "Conta Poupança";
  if (tipo === "investimento") return "Conta Investimento";
  return "";
}

function tipoPagamentoLabel(tipo: string | null): string {
  if (!tipo) return "";
  const t = tipo.toLowerCase();
  if (t === "pix") return "PIX";
  if (t === "transferencia" || t === "transferência") return "Transferência";
  return tipo;
}

function buildDadosBancariosHtml(tipoPagamento: string | null, dados: DadosBancarios | null): string {
  if (!tipoPagamento || !dados) return "";
  const t = tipoPagamento.toLowerCase();
  if (t !== "pix" && t !== "transferencia" && t !== "transferência") return "";

  const titular = resolveTitularPJ(dados.descricao);
  const tipoContaTxt = tipoContaLabel(dados.tipo_conta);
  const contaCompleta = dados.conta
    ? `${dados.conta}${tipoContaTxt ? ` (${tipoContaTxt})` : ""}`
    : "-";

  const titularPJHtml = titular
    ? `<tr><td>Razão Social:</td><td>${titular.razao_social}</td></tr><tr><td>CNPJ:</td><td>${titular.cnpj}</td></tr>`
    : "";

  return `
    <div>
      <p>💳 Forma de Pagamento: ${tipoPagamentoLabel(tipoPagamento)}</p>
      <table>
        <tr><td>Titular:</td><td>${dados.descricao}</td></tr>
        ${titularPJHtml}
        <tr><td>Banco:</td><td>${dados.banco}</td></tr>
        <tr><td>Agência:</td><td>${dados.agencia || "-"}</td></tr>
        <tr><td>Conta:</td><td>${contaCompleta}</td></tr>
      </table>
    </div>
  `;
}

// ---- Fixtures ----

const contaMatrizB8One: DadosBancarios = {
  banco: "Itaú Unibanco S.A",
  agencia: "2937",
  conta: "21551-3",
  tipo_conta: "corrente",
  descricao: "Banco Itaú - Matriz b8one",
};

const contaFilialB8One: DadosBancarios = {
  banco: "Banco do Brasil",
  agencia: "1234",
  conta: "5678-9",
  tipo_conta: "corrente",
  descricao: "BB - Filial b8one",
};

const contaMatrizLomadee: DadosBancarios = {
  banco: "Bradesco",
  agencia: "0001",
  conta: "1111-1",
  tipo_conta: "corrente",
  descricao: "Bradesco - Matriz Lomadee",
};

const contaMatrizCryah: DadosBancarios = {
  banco: "Santander",
  agencia: "0050",
  conta: "9999-2",
  tipo_conta: "poupanca",
  descricao: "Santander - Matriz Cryah",
};

const contaGarantiaB8One: DadosBancarios = {
  banco: "BTG Pactual",
  agencia: "0050",
  conta: "00425644-1",
  tipo_conta: "corrente",
  descricao: "BTG - Conta Garantia b8one",
};

const contaNaoMapeada: DadosBancarios = {
  banco: "Inter",
  agencia: "0001",
  conta: "12345-6",
  tipo_conta: "corrente",
  descricao: "Inter - Conta Antiga Teste",
};

// ---- resolveTitularPJ ----

Deno.test("resolveTitularPJ: Matriz b8one", () => {
  const r = resolveTitularPJ(contaMatrizB8One.descricao);
  assertEquals(r?.razao_social, "B8ONE CONSULTORIA TECNICA EM TI LTDA");
  assertEquals(r?.cnpj, "31.044.681/0001-13");
});

Deno.test("resolveTitularPJ: Conta Garantia b8one (mesmo CNPJ matriz)", () => {
  const r = resolveTitularPJ(contaGarantiaB8One.descricao);
  assertEquals(r?.cnpj, "31.044.681/0001-13");
});

Deno.test("resolveTitularPJ: Filial b8one", () => {
  const r = resolveTitularPJ(contaFilialB8One.descricao);
  assertEquals(r?.cnpj, "31.044.681/0002-02");
});

Deno.test("resolveTitularPJ: Matriz Lomadee → PLUGONE", () => {
  const r = resolveTitularPJ(contaMatrizLomadee.descricao);
  assertEquals(r?.razao_social, "PLUGONE CONSULTORIA TECNICA EM TI LTDA");
  assertEquals(r?.cnpj, "38.442.433/0001-70");
});

Deno.test("resolveTitularPJ: Matriz Cryah", () => {
  const r = resolveTitularPJ(contaMatrizCryah.descricao);
  assertEquals(r?.razao_social, "CRYAH AGENCIA DIGITAL LTDA");
  assertEquals(r?.cnpj, "12.104.320/0001-70");
});

Deno.test("resolveTitularPJ: case-insensitive", () => {
  const r = resolveTitularPJ("BANCO ITAU - MATRIZ B8ONE");
  assertEquals(r?.cnpj, "31.044.681/0001-13");
});

Deno.test("resolveTitularPJ: conta não mapeada → null", () => {
  assertEquals(resolveTitularPJ(contaNaoMapeada.descricao), null);
});

Deno.test("resolveTitularPJ: descrição vazia → null", () => {
  assertEquals(resolveTitularPJ(""), null);
});

// ---- buildDadosBancariosHtml: mapped accounts ----

Deno.test("buildDadosBancariosHtml: PIX + Matriz b8one inclui Razão Social e CNPJ", () => {
  const html = buildDadosBancariosHtml("pix", contaMatrizB8One);
  assertStringIncludes(html, "Forma de Pagamento: PIX");
  assertStringIncludes(html, "Banco Itaú - Matriz b8one");
  assertStringIncludes(html, "B8ONE CONSULTORIA TECNICA EM TI LTDA");
  assertStringIncludes(html, "31.044.681/0001-13");
  assertStringIncludes(html, "Itaú Unibanco S.A");
  assertStringIncludes(html, "2937");
  assertStringIncludes(html, "21551-3 (Conta Corrente)");
});

Deno.test("buildDadosBancariosHtml: Transferência + Filial b8one usa CNPJ /0002-02", () => {
  const html = buildDadosBancariosHtml("transferencia", contaFilialB8One);
  assertStringIncludes(html, "Forma de Pagamento: Transferência");
  assertStringIncludes(html, "31.044.681/0002-02");
  assert(!html.includes("31.044.681/0001-13"), "não deve vazar CNPJ da matriz");
});

Deno.test("buildDadosBancariosHtml: Matriz Lomadee usa razão PLUGONE", () => {
  const html = buildDadosBancariosHtml("pix", contaMatrizLomadee);
  assertStringIncludes(html, "PLUGONE CONSULTORIA TECNICA EM TI LTDA");
  assertStringIncludes(html, "38.442.433/0001-70");
});

Deno.test("buildDadosBancariosHtml: Matriz Cryah + poupança", () => {
  const html = buildDadosBancariosHtml("transferência", contaMatrizCryah);
  assertStringIncludes(html, "CRYAH AGENCIA DIGITAL LTDA");
  assertStringIncludes(html, "12.104.320/0001-70");
  assertStringIncludes(html, "9999-2 (Conta Poupança)");
});

// ---- buildDadosBancariosHtml: unmapped account ----

Deno.test("buildDadosBancariosHtml: conta não mapeada omite Razão/CNPJ mas mostra dados bancários", () => {
  const html = buildDadosBancariosHtml("pix", contaNaoMapeada);
  assertStringIncludes(html, "Forma de Pagamento: PIX");
  assertStringIncludes(html, "Inter - Conta Antiga Teste");
  assertStringIncludes(html, "Inter");
  assertStringIncludes(html, "12345-6 (Conta Corrente)");
  assert(!html.includes("Razão Social:"), "não deve renderizar Razão Social");
  assert(!html.includes("CNPJ:"), "não deve renderizar CNPJ");
});

// ---- buildDadosBancariosHtml: skip cases ----

Deno.test("buildDadosBancariosHtml: boleto retorna string vazia (não exibe bloco)", () => {
  assertEquals(buildDadosBancariosHtml("boleto", contaMatrizB8One), "");
});

Deno.test("buildDadosBancariosHtml: tipo_pagamento null retorna vazio", () => {
  assertEquals(buildDadosBancariosHtml(null, contaMatrizB8One), "");
});

Deno.test("buildDadosBancariosHtml: dados null retorna vazio", () => {
  assertEquals(buildDadosBancariosHtml("pix", null), "");
});
