export interface ItemTotalPedido {
  quantidade: number;
  preco: number;
}

export class PedidoModelo {
  #itens: ItemTotalPedido[];

  constructor(itens: ItemTotalPedido[]) {
    this.#itens = itens.map((item) => ({ ...item }));
  }

  total(): number {
    return this.#itens.reduce((soma, item) => soma + item.quantidade * item.preco, 0);
  }
}
