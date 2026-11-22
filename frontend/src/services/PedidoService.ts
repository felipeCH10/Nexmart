import type { CampoConfig, Pedido } from '../entities/types';
import { RecursoService } from './RecursoService';

export class PedidoService extends RecursoService<Pedido> {
  readonly caminho = 'pedidos';
  readonly titulo = 'Pedidos';
  readonly campos: CampoConfig[] = [
    { nome: 'cliente', rotulo: 'Cliente', tipo: 'texto' },
    { nome: 'status', rotulo: 'Status', tipo: 'opcoes', opcoes: ['aberto', 'pago', 'cancelado'] },
  ];
}
