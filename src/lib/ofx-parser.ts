/**
 * Parser de OFX (Open Financial Exchange) e CSV/Excel para conciliação bancária.
 * Suporta OFX 1.x (SGML) e OFX 2.x (XML).
 */

import * as XLSX from 'xlsx';

export interface OfxTransaction {
  fitid: string | null;
  data_movimento: string; // YYYY-MM-DD
  valor: number; // positivo
  tipo: 'entrada' | 'saida';
  descricao: string;
}

export interface ParseError {
  /** Índice (1-based) na sequência lida do arquivo (linha da planilha ou bloco do OFX) */
  linha: number;
  motivo: string;
  /** Conteúdo bruto da linha/bloco para diagnóstico (limitado a ~200 chars) */
  raw?: string;
}

export interface ParsedExtrato {
  transacoes: OfxTransaction[];
  data_inicio: string | null;
  data_fim: string | null;
  /** Linhas/blocos descartados durante o parsing, com motivo */
  erros: ParseError[];
  /** Total de blocos/linhas considerados (válidos + erros) */
  totalLidos: number;
  /** Formato detectado */
  formato: 'ofx' | 'csv' | 'xlsx' | 'desconhecido';
}

function parseOfxDate(raw: string): string | null {
  if (!raw) return null;
  // Formato típico: YYYYMMDD ou YYYYMMDDHHMMSS[.SSS][TZ]
  const clean = raw.trim().replace(/\[.*?\]/g, '');
  const match = clean.match(/^(\d{4})(\d{2})(\d{2})/);
  if (!match) return null;
  return `${match[1]}-${match[2]}-${match[3]}`;
}

function extractTagValue(block: string, tag: string): string | null {
  // Suporta tanto SGML (sem fechamento) quanto XML (<TAG>val</TAG>)
  const xmlRegex = new RegExp(`<${tag}>([^<]*)</${tag}>`, 'i');
  const xmlMatch = block.match(xmlRegex);
  if (xmlMatch) return xmlMatch[1].trim();

  const sgmlRegex = new RegExp(`<${tag}>([^<\\r\\n]*)`, 'i');
  const sgmlMatch = block.match(sgmlRegex);
  if (sgmlMatch) return sgmlMatch[1].trim();

  return null;
}

function truncateRaw(s: string): string {
  const trimmed = s.replace(/\s+/g, ' ').trim();
  return trimmed.length > 200 ? trimmed.slice(0, 197) + '...' : trimmed;
}

export function parseOfx(content: string): ParsedExtrato {
  const erros: ParseError[] = [];
  // Remove header SGML (linhas antes do primeiro <)
  const ofxStart = content.indexOf('<OFX>');
  const body = ofxStart >= 0 ? content.slice(ofxStart) : content;

  // Período
  const dtStart = parseOfxDate(extractTagValue(body, 'DTSTART') || '');
  const dtEnd = parseOfxDate(extractTagValue(body, 'DTEND') || '');

  // Extrai blocos <STMTTRN>...</STMTTRN>
  const transacoes: OfxTransaction[] = [];
  const blocosLidos: string[] = [];
  const trnRegex = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi;
  let match: RegExpExecArray | null;
  while ((match = trnRegex.exec(body)) !== null) {
    blocosLidos.push(match[1]);
  }

  // Se não houve fechamento, tenta SGML antigo (sem </STMTTRN>)
  if (blocosLidos.length === 0) {
    const sgmlRegex = /<STMTTRN>([\s\S]*?)(?=<STMTTRN>|<\/BANKTRANLIST>|$)/gi;
    while ((match = sgmlRegex.exec(body)) !== null) {
      blocosLidos.push(match[1]);
    }
  }

  blocosLidos.forEach((block, idx) => {
    const linha = idx + 1;
    const trntype = (extractTagValue(block, 'TRNTYPE') || '').toUpperCase();
    const dtposted = parseOfxDate(extractTagValue(block, 'DTPOSTED') || '');
    const trnamtRaw = extractTagValue(block, 'TRNAMT');
    const fitid = extractTagValue(block, 'FITID');
    const memo = extractTagValue(block, 'MEMO') || extractTagValue(block, 'NAME') || '';

    if (!dtposted) {
      erros.push({ linha, motivo: 'Data (DTPOSTED) ausente ou inválida', raw: truncateRaw(block) });
      return;
    }
    if (!trnamtRaw) {
      erros.push({ linha, motivo: 'Valor (TRNAMT) ausente', raw: truncateRaw(block) });
      return;
    }
    const valorNum = parseFloat(trnamtRaw.replace(',', '.'));
    if (isNaN(valorNum)) {
      erros.push({ linha, motivo: `Valor inválido: "${trnamtRaw}"`, raw: truncateRaw(block) });
      return;
    }
    if (valorNum === 0) {
      erros.push({ linha, motivo: 'Valor zero — transação ignorada', raw: truncateRaw(block) });
      return;
    }

    const tipo: 'entrada' | 'saida' =
      trntype === 'CREDIT' || trntype === 'DEP' || (trntype === '' && valorNum > 0)
        ? 'entrada'
        : trntype === 'DEBIT' || trntype === 'PAYMENT' || trntype === 'XFER' || (trntype === '' && valorNum < 0)
          ? 'saida'
          : valorNum >= 0
            ? 'entrada'
            : 'saida';

    transacoes.push({
      fitid: fitid || null,
      data_movimento: dtposted,
      valor: Math.abs(valorNum),
      tipo,
      descricao: memo.trim(),
    });
  });

  return {
    transacoes,
    erros,
    totalLidos: blocosLidos.length,
    formato: 'ofx',
    data_inicio: dtStart || (transacoes[0]?.data_movimento ?? null),
    data_fim: dtEnd || (transacoes[transacoes.length - 1]?.data_movimento ?? null),
  };
}

/**
 * Converte uma data em diferentes formatos para YYYY-MM-DD.
 * Aceita: Date, número serial Excel, "DD/MM/YYYY", "YYYY-MM-DD".
 */
function normalizeDate(raw: any): string | null {
  if (raw == null || raw === '') return null;
  if (raw instanceof Date) {
    const y = raw.getFullYear();
    const m = String(raw.getMonth() + 1).padStart(2, '0');
    const d = String(raw.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  if (typeof raw === 'number') {
    // Excel serial date
    const date = XLSX.SSF.parse_date_code(raw);
    if (!date) return null;
    return `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`;
  }
  const str = String(raw).trim();
  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) return str.slice(0, 10);
  // DD/MM/YYYY
  const br = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (br) {
    return `${br[3]}-${br[2].padStart(2, '0')}-${br[1].padStart(2, '0')}`;
  }
  return null;
}

function normalizeNumber(raw: any): number | null {
  if (raw == null || raw === '') return null;
  if (typeof raw === 'number') return raw;
  let str = String(raw).trim();
  // Remove R$ e espaços
  str = str.replace(/[R$\s]/g, '');
  // Se tem vírgula como decimal (formato BR): "1.234,56" -> "1234.56"
  if (str.includes(',') && str.lastIndexOf(',') > str.lastIndexOf('.')) {
    str = str.replace(/\./g, '').replace(',', '.');
  } else {
    // Formato US: "1,234.56" -> "1234.56"
    str = str.replace(/,/g, '');
  }
  const n = parseFloat(str);
  return isNaN(n) ? null : n;
}

/**
 * Parser CSV/Excel para extratos bancários simples.
 * Espera colunas: data, valor, descricao (case-insensitive, aceita variações).
 * Valor positivo = entrada; valor negativo = saída.
 */
export function parseSpreadsheetExtrato(buffer: ArrayBuffer, formato: 'csv' | 'xlsx' = 'xlsx'): ParsedExtrato {
  const erros: ParseError[] = [];
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

  const findKey = (row: any, candidates: string[]): string | undefined => {
    const keys = Object.keys(row);
    for (const cand of candidates) {
      const found = keys.find(k => k.toLowerCase().trim() === cand.toLowerCase());
      if (found) return found;
    }
    return undefined;
  };

  // Validação de colunas mínimas (uma única vez, baseada na primeira linha)
  if (rows.length === 0) {
    return { transacoes: [], erros: [{ linha: 0, motivo: 'Arquivo vazio ou sem cabeçalho reconhecível' }], totalLidos: 0, formato, data_inicio: null, data_fim: null };
  }
  const sample = rows[0];
  const hasData = !!findKey(sample, ['data', 'data_movimento', 'data movimento', 'date']);
  const hasValor = !!findKey(sample, ['valor', 'value', 'amount']);
  if (!hasData || !hasValor) {
    erros.push({
      linha: 0,
      motivo: `Cabeçalho inválido. Colunas obrigatórias: "data" e "valor". Detectadas: ${Object.keys(sample).join(', ')}`,
    });
  }

  const transacoes: OfxTransaction[] = [];
  rows.forEach((row, idx) => {
    const linha = idx + 2; // +1 header +1 base 1
    const dataKey = findKey(row, ['data', 'data_movimento', 'data movimento', 'date']);
    const valorKey = findKey(row, ['valor', 'value', 'amount']);
    const descKey = findKey(row, ['descricao', 'descrição', 'description', 'memo', 'historico', 'histórico']);
    const tipoKey = findKey(row, ['tipo', 'type']);

    const rawSnapshot = truncateRaw(JSON.stringify(row));
    const data = dataKey ? normalizeDate(row[dataKey]) : null;
    const valorRaw = valorKey ? normalizeNumber(row[valorKey]) : null;
    const descricao = descKey ? String(row[descKey] || '').trim() : '';
    const tipoRaw = tipoKey ? String(row[tipoKey] || '').trim().toLowerCase() : '';

    if (!dataKey) {
      erros.push({ linha, motivo: 'Coluna "data" não encontrada', raw: rawSnapshot });
      return;
    }
    if (!data) {
      erros.push({ linha, motivo: `Data inválida: "${row[dataKey]}"`, raw: rawSnapshot });
      return;
    }
    if (!valorKey) {
      erros.push({ linha, motivo: 'Coluna "valor" não encontrada', raw: rawSnapshot });
      return;
    }
    if (valorRaw == null) {
      erros.push({ linha, motivo: `Valor inválido: "${row[valorKey]}"`, raw: rawSnapshot });
      return;
    }
    if (valorRaw === 0) {
      erros.push({ linha, motivo: 'Valor zero — transação ignorada', raw: rawSnapshot });
      return;
    }

    let tipo: 'entrada' | 'saida';
    if (tipoRaw === 'entrada' || tipoRaw === 'credit' || tipoRaw === 'credito' || tipoRaw === 'crédito') {
      tipo = 'entrada';
    } else if (tipoRaw === 'saida' || tipoRaw === 'saída' || tipoRaw === 'debit' || tipoRaw === 'debito' || tipoRaw === 'débito') {
      tipo = 'saida';
    } else {
      tipo = valorRaw >= 0 ? 'entrada' : 'saida';
    }

    transacoes.push({
      fitid: null,
      data_movimento: data,
      valor: Math.abs(valorRaw),
      tipo,
      descricao,
    });
  });

  const datas = transacoes.map(t => t.data_movimento).sort();
  return {
    transacoes,
    erros,
    totalLidos: rows.length,
    formato,
    data_inicio: datas[0] ?? null,
    data_fim: datas[datas.length - 1] ?? null,
  };
}

export async function parseExtratoFile(file: File): Promise<ParsedExtrato> {
  const lower = file.name.toLowerCase();
  if (lower.endsWith('.ofx') || lower.endsWith('.qfx')) {
    const text = await file.text();
    return parseOfx(text);
  }
  if (lower.endsWith('.csv')) {
    const buffer = await file.arrayBuffer();
    return parseSpreadsheetExtrato(buffer, 'csv');
  }
  if (lower.endsWith('.xlsx') || lower.endsWith('.xls')) {
    const buffer = await file.arrayBuffer();
    return parseSpreadsheetExtrato(buffer, 'xlsx');
  }
  // Tenta como OFX por padrão
  const text = await file.text();
  return parseOfx(text);
}
