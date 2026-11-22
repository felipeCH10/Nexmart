import type { CampoConfig, ItemPedido } from '../entities/types';
import { RecursoService } from './RecursoService';

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
