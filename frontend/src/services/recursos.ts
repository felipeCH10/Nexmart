import type { CampoConfig, Categoria, Entidade, ItemPedido, Pedido, Produto } from '../models/types';
import type { CheckoutResposta } from '../models/types';
import { RecursoService } from './RecursoService';
import { HttpClient } from './HttpClient';

export class CategoriaService extends RecursoService<Categoria> {
  readonly caminho = 'categorias';
  readonly titulo = 'Categorias';
  readonly campos: CampoConfig[] = [
    { nome: 'nome', rotulo: 'Nome', tipo: 'texto' },
    { nome: 'descricao', rotulo: 'Descrição', tipo: 'texto', obrigatorio: false },
  ];
}

export class ProdutoService extends RecursoService<Produto> {
  readonly caminho = 'produtos';
  readonly titulo = 'Produtos';
  readonly campos: CampoConfig[] = [
    { nome: 'nome', rotulo: 'Nome', tipo: 'texto' },
    { nome: 'preco', rotulo: 'Preço', tipo: 'decimal' },
    { nome: 'estoque', rotulo: 'Estoque', tipo: 'inteiro' },
    { nome: 'categoria_id', rotulo: 'Categoria', tipo: 'relacao', relacao: { recurso: 'categorias', exibir: 'nome' } },
    { nome: 'parcelas_sem_juros', rotulo: 'Parcelas sem juros', tipo: 'inteiro' },
    { nome: 'parcelas_com_juros', rotulo: 'Parcelas com juros', tipo: 'inteiro' },
    { nome: 'imagem', rotulo: 'Imagem do produto', tipo: 'texto', obrigatorio: false },
  ];
}

export class PedidoService extends RecursoService<Pedido> {
  readonly caminho = 'pedidos';
  readonly titulo = 'Pedidos';
  readonly campos: CampoConfig[] = [
    { nome: 'cliente', rotulo: 'Cliente', tipo: 'texto' },
    { nome: 'status', rotulo: 'Status', tipo: 'opcoes', opcoes: ['aberto', 'pago', 'cancelado'] },
  ];
}

export class ItemPedidoService extends RecursoService<ItemPedido> {
  readonly caminho = 'itens-pedido';
  readonly titulo = 'Itens do pedido';
  readonly campos: CampoConfig[] = [
    { nome: 'pedido_id', rotulo: 'Pedido', tipo: 'inteiro' },
    { nome: 'produto_id', rotulo: 'Produto', tipo: 'inteiro' },
    { nome: 'quantidade', rotulo: 'Quantidade', tipo: 'inteiro' },
    { nome: 'preco_unitario', rotulo: 'Preço unitário', tipo: 'decimal' },
  ];
}

export const http = new HttpClient();

export function finalizarCheckout(
  itens: { produto_id: number; quantidade: number; parcelas: number }[],
  chave: string,
): Promise<CheckoutResposta> {
  return http.requisitar<CheckoutResposta>('POST', '/pedidos/checkout', { itens, chave });
}

export const servicos: Record<string, RecursoService<Entidade>> = {
  categorias: new CategoriaService(http),
  produtos: new ProdutoService(http),
  pedidos: new PedidoService(http),
  'itens-pedido': new ItemPedidoService(http),
};
