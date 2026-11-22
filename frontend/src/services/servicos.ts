import type { CheckoutResposta, Entidade } from '../entities/types';
import { HttpClient } from './HttpClient';
import { RecursoService } from './RecursoService';
import { CategoriaService } from './CategoriaService';
import { ProdutoService } from './ProdutoService';
import { PedidoService } from './PedidoService';
import { ItemPedidoService } from './ItemPedidoService';

export const http = new HttpClient();

export function finalizarCheckout(
  itens: { produto_id: number; quantidade: number; parcelas: number }[],
  chave: string,
): Promise<CheckoutResposta> {
  return http.requisitar<CheckoutResposta>('POST', '/pedidos/checkout', { itens, chave });
}

export const produtoService = new ProdutoService(http);
export const categoriaService = new CategoriaService(http);

export const servicos: Record<string, RecursoService<Entidade>> = {
  categorias: categoriaService,
  produtos: produtoService,
  pedidos: new PedidoService(http),
  'itens-pedido': new ItemPedidoService(http),
};
