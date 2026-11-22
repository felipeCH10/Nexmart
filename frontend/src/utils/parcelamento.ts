import { ProdutoModelo } from '../entities/ProdutoModelo';

export function calcularParcelamento(preco: number, parcelas: number, semJuros: number, quantidade = 1): {
  total: number;
  valorParcela: number;
  comJuros: boolean;
} {
  return new ProdutoModelo(preco, semJuros).calcularParcelamento(parcelas, quantidade);
}
