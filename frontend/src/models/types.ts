export interface Usuario {
  id: number;
  nome: string;
  email: string;
  cpf: string;
}

export interface LoginResposta {
  token: string;
  usuario: Usuario;
}

export interface Entidade {
  id: number;
  [chave: string]: unknown;
}

export interface Categoria extends Entidade {
  nome: string;
  descricao: string | null;
}

export interface Produto extends Entidade {
  nome: string;
  preco: string;
  estoque: number;
  categoria_id: number;
  parcelas_sem_juros: number;
  parcelas_com_juros: number;
  imagem: string;
}

export type StatusPedido = 'aberto' | 'pago' | 'cancelado';

export interface Pedido extends Entidade {
  cliente: string;
  status: StatusPedido;
}

export interface ItemPedido extends Entidade {
  pedido_id: number;
  produto_id: number;
  quantidade: number;
  preco_unitario: string;
  parcelas: number;
}

export interface CheckoutResposta {
  mensagem: string;
  pedido_id: number;
  itens: { produto_id: number; quantidade: number; parcelas: number; preco: string }[];
  total: number;
}

export interface Pagina<T> {
  dados: T[];
  pagina: number;
  limite: number;
  total: number;
  totalPaginas: number;
}

export type TipoCampo = 'texto' | 'inteiro' | 'decimal' | 'opcoes' | 'relacao';

export interface CampoConfig {
  nome: string;
  rotulo: string;
  tipo: TipoCampo;
  obrigatorio?: boolean;
  opcoes?: string[];
  relacao?: { recurso: string; exibir: string };
}
