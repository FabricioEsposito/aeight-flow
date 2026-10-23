interface RetencoesInput {
  valor: number;
  valorParcela?: number | null;
  valorOriginal?: number | null;
  irrfPercentual: number;
  pisPercentual: number;
  cofinsPercentual: number;
  csllPercentual: number;
}

const round2 = (value: number) => Math.round(value * 100) / 100;

/** Use the installment's historical gross, never the contract's current price. */
export function calcularRetencoes(input: RetencoesInput) {
  const totalPercentual = input.irrfPercentual + input.pisPercentual +
    input.cofinsPercentual + input.csllPercentual;
  const valorBruto = round2(
    input.valorParcela != null && input.valorParcela > 0
      ? input.valorParcela
      : input.valorOriginal != null && input.valorOriginal > 0
        ? input.valorOriginal
        : totalPercentual > 0 && totalPercentual < 100
          ? input.valor / (1 - totalPercentual / 100)
          : input.valor
  );
  const irrfValor = round2(valorBruto * input.irrfPercentual / 100);
  const pisValor = round2(valorBruto * input.pisPercentual / 100);
  const cofinsValor = round2(valorBruto * input.cofinsPercentual / 100);
  const csllValor = round2(valorBruto * input.csllPercentual / 100);

  return {
    valor_bruto: valorBruto,
    irrf_valor: irrfValor,
    pis_valor: pisValor,
    cofins_valor: cofinsValor,
    csll_valor: csllValor,
    valor_liquido: round2(valorBruto - irrfValor - pisValor - cofinsValor - csllValor),
  };
}