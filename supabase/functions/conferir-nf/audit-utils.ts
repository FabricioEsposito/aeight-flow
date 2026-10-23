export function invoiceStoragePath(link: string, supabaseUrl: string): string {
  let path = link;
  if (link.includes('://')) {
    const url = new URL(link);
    if (url.origin !== new URL(supabaseUrl).origin || url.protocol !== 'https:') {
      throw new Error('O PDF não pertence ao armazenamento fiscal autorizado.');
    }
    const match = url.pathname.match(/^\/storage\/v1\/object\/(?:public|sign)\/faturamento-docs\/(.+)$/);
    if (!match) throw new Error('Local do PDF fiscal não autorizado.');
    path = decodeURIComponent(match[1]);
  }
  if (!path || path.startsWith('/') || /[\\\x00-\x1f?#]/.test(path) || path.split('/').some(p => p === '..' || p === '.')) {
    throw new Error('Caminho do PDF fiscal inválido.');
  }
  return path;
}

export interface FiscalExtraction {
  valor_bruto_pdf: number | null;
  numero_nf_pdf: string | null;
  cnpj_tomador_pdf: string | null;
  evidencia: string | null;
  confianca: string;
}

const digits = (value: string) => value.replace(/\D/g, '');
const invoiceNumber = (value: string) => digits(value).replace(/^0+(?=\d)/, '');

export function validateExtraction(pdf: FiscalExtraction, numero: string | null, cnpj: string | null) {
  if (pdf.confianca !== 'alta' || pdf.valor_bruto_pdf == null || !Number.isFinite(pdf.valor_bruto_pdf) || pdf.valor_bruto_pdf <= 0 || !pdf.evidencia?.trim()) {
    return { status: 'revisao', motivo: 'Valor bruto não identificado com segurança no PDF.' };
  }
  if (!numero || !pdf.numero_nf_pdf || !invoiceNumber(numero) || invoiceNumber(numero) !== invoiceNumber(pdf.numero_nf_pdf)) {
    return { status: 'revisao', motivo: 'O número da nota no PDF não foi confirmado com o lançamento.' };
  }
  if (!cnpj || !pdf.cnpj_tomador_pdf || digits(cnpj) !== digits(pdf.cnpj_tomador_pdf)) {
    return { status: 'revisao', motivo: 'O CNPJ/CPF do tomador no PDF não foi confirmado com o cliente.' };
  }
  return { status: 'extraido', motivo: null };
}

export function grossDifference(reportGross: number, pdfGross: number) {
  const cents = Math.round(pdfGross * 100) - Math.round(reportGross * 100);
  return { diferenca: cents / 100, divergente: Math.abs(cents) > 1 };
}