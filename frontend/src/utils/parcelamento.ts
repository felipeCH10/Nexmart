export function taxaJurosPorPreco(preco: number): number {
  if (preco <= 100) return 0.05;
  if (preco <= 400) return 0.025;
  return 0.01;
}

export function calcularParcelamento(preco: number, parcelas: number, semJuros: number, quantidade = 1): {
  total: number;
  valorParcela: number;
  comJuros: boolean;
} {
  const totalBase = preco * quantidade;
  const comJuros = parcelas > semJuros;
  const total = comJuros
    ? totalBase * (1 + parcelas * taxaJurosPorPreco(preco))
    : totalBase;
  return { total, valorParcela: total / parcelas, comJuros };
}
