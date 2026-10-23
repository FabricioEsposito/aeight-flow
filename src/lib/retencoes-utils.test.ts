import { describe, it as test } from 'node:test';
import { deepStrictEqual, strictEqual } from 'node:assert';
import { calcularRetencoes } from './retencoes-utils';

const impostos = {
  irrfPercentual: 1.5,
  pisPercentual: 0.65,
  cofinsPercentual: 3,
  csllPercentual: 1,
};

describe('Retenções históricas da Acer (AGP)', () => {
  test('NF 622: usa bruto histórico de 20.000, não líquido de 18.770 nem preço atual do contrato', () => {
    deepStrictEqual(calcularRetencoes({ ...impostos, valor: 18770, valorParcela: 20000, valorOriginal: 20000 }), {
      valor_bruto: 20000, irrf_valor: 300, pis_valor: 130,
      cofins_valor: 600, csll_valor: 200, valor_liquido: 18770,
    });
  });

  test('NF 616: preserva bruto de 15.920 e líquido de 14.940,92', () => {
    deepStrictEqual(calcularRetencoes({ ...impostos, valor: 14940.92, valorParcela: 15920, valorOriginal: 15920 }), {
      valor_bruto: 15920, irrf_valor: 238.8, pis_valor: 103.48,
      cofins_valor: 477.6, csll_valor: 159.2, valor_liquido: 14940.92,
    });
  });

  test('o valor histórico da parcela tem prioridade sobre outra referência', () => {
    strictEqual(calcularRetencoes({ ...impostos, valor: 18770, valorParcela: 20000, valorOriginal: 35450 }).valor_bruto, 20000);
  });

  test('sem referência histórica, recompõe bruto a partir do líquido sem descontar impostos duas vezes', () => {
    strictEqual(calcularRetencoes({ ...impostos, valor: 18770 }).valor_bruto, 20000);
  });
});