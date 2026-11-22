import { ValidacaoError } from '../errors/ValidacaoError';
import type { Parcelamento } from './types';

export class ProdutoModelo {
  #preco: number;
  #parcelasSemJuros: number;

  constructor(preco: number, parcelasSemJuros: number) {
    if (preco <= 0) throw new ValidacaoError({ preco: 'Preço inválido.' });
    if (parcelasSemJuros < 1) throw new ValidacaoError({ parcelas: 'Parcelas inválidas.' });
    this.#preco = preco;
    this.#parcelasSemJuros = parcelasSemJuros;
  }

  totalComJuros(parcelas: number, quantidade = 1): number {
    const totalBase = this.#preco * quantidade;
    if (parcelas <= this.#parcelasSemJuros) return totalBase;
    return totalBase * (1 + parcelas * this.#taxa());
  }

  calcularParcelamento(parcelas: number, quantidade = 1): Parcelamento {
    const total = this.totalComJuros(parcelas, quantidade);
    return {
      total,
      valorParcela: total / parcelas,
      comJuros: parcelas > this.#parcelasSemJuros,
    };
  }

  #taxa(): number {
    if (this.#preco <= 100) return 0.05;
    if (this.#preco <= 400) return 0.025;
    return 0.01;
  }
}
