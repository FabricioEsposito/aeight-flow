/// <reference types="node" />
import { it } from 'node:test';
import { strictEqual, throws } from 'node:assert';
import { invoiceStoragePath, validateExtraction, grossDifference } from '../../supabase/functions/conferir-nf/audit-utils';
import { resultadoConferencia } from './conferencia-nf';

it('sinaliza divergência entre bruto fiscal e bruto do relatório sem alterar o relatório', () => {
  strictEqual(grossDifference(18770, 20000).divergente, true);
  strictEqual(grossDifference(18770, 20000).diferenca, 1230);
  strictEqual(grossDifference(20000, 20000).divergente, false);
});
it('tolera um centavo, mas sinaliza dois centavos', () => {
  strictEqual(grossDifference(100, 100.01).divergente, false);
  strictEqual(grossDifference(100, 100.02).divergente, true);
});
it('PDF ambíguo ou pertencente a outro cliente exige revisão', () => {
  const pdf = { valor_bruto_pdf: 20000, numero_nf_pdf: '000622', cnpj_tomador_pdf: '11.068.167/0001-00', evidencia: 'Valor dos Serviços R$ 20.000,00 página 1', confianca: 'alta' };
  strictEqual(validateExtraction(pdf, '622', '11068167000100').status, 'extraido');
  strictEqual(validateExtraction({ ...pdf, confianca: 'baixa' }, '622', '11068167000100').status, 'revisao');
  strictEqual(validateExtraction(pdf, '616', '11068167000100').status, 'revisao');
  strictEqual(validateExtraction(pdf, '622', '00000000000000').status, 'revisao');
});
it('links externos e caminhos de outros buckets não podem acessar arquivos', () => {
  const origin = 'https://epgifclglrrgzpguqbde.supabase.co';
  strictEqual(invoiceStoragePath(`${origin}/storage/v1/object/public/faturamento-docs/cliente/nf.pdf`, origin), 'cliente/nf.pdf');
  throws(() => invoiceStoragePath('https://example.com/nf.pdf', origin));
  throws(() => invoiceStoragePath(`${origin}/storage/v1/object/public/holerites/arquivo.pdf`, origin));
  throws(() => invoiceStoragePath('../holerites/arquivo.pdf', origin));
});
it('troca de link invalida a conferência anterior', () => {
  strictEqual(resultadoConferencia(20000, 'nova.pdf', { conta_receber_id: 'a', link_nf: 'antiga.pdf', valor_bruto_pdf: 20000, status: 'extraido', motivo: null, evidencia: null, updated_at: '' }).status, 'pendente');
});