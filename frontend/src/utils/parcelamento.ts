import { ProdutoModelo } from '../entities/ProdutoModelo';
import type { Parcelamento } from '../entities/types';

export function calcularParcelamento(preco: number, parcelas: number, semJuros: number, quantidade = 1): Parcelamento {
  return new ProdutoModelo(preco, semJuros).calcularParcelamento(parcelas, quantidade);
}
