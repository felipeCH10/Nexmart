// Camada de acesso à API PHP: tipos, exceções, cliente HTTP e serviços por recurso.

// ---------- Tipos ----------
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

// ---------- Exceção personalizada ----------
export class ApiError extends Error {
  constructor(
    mensagem: string,
    public readonly status: number,
    public readonly campos: Record<string, string> = {},
  ) {
    super(mensagem);
    this.name = 'ApiError';
  }
}

export function mensagemDe(e: unknown): string {
  return e instanceof Error ? e.message : 'Erro inesperado.';
}

// ---------- Cliente HTTP (guarda o token com encapsulamento) ----------
interface CorpoErro {
  erro?: string;
  campos?: Record<string, string>;
}

export class HttpClient {
  #token: string | null = localStorage.getItem('token');
  aoExpirarSessao: (() => void) | null = null;

  get autenticado(): boolean {
    return this.#token !== null;
  }

  set token(valor: string | null) {
    if (valor !== null && !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(valor)) {
      throw new Error('Token de autenticação inválido.');
    }
    this.#token = valor;
    if (valor === null) localStorage.removeItem('token');
    else localStorage.setItem('token', valor);
  }

  async requisitar<R>(metodo: string, caminho: string, corpo?: unknown): Promise<R> {
    const cabecalhos: Record<string, string> = {};
    if (!(corpo instanceof FormData)) cabecalhos['Content-Type'] = 'application/json';
    if (this.#token !== null) cabecalhos['Authorization'] = `Bearer ${this.#token}`;

    let resposta: Response;
    try {
      resposta = await fetch(`/api${caminho}`, {
        method: metodo,
        headers: cabecalhos,
        body: corpo === undefined ? undefined : corpo instanceof FormData ? corpo : JSON.stringify(corpo),
      });
    } catch {
      throw new ApiError('Não foi possível conectar ao servidor. Tente novamente.', 0);
    }

    const dados: unknown = await resposta.json().catch(() => null);

    if (!resposta.ok) {
      const erro = (dados ?? {}) as CorpoErro;
      if (resposta.status === 401 && this.#token !== null) this.aoExpirarSessao?.();
      throw new ApiError(erro.erro ?? 'Erro inesperado no servidor.', resposta.status, erro.campos ?? {});
    }
    return dados as R;
  }
}

export const http = new HttpClient();

// ---------- Serviços (classe abstrata + subclasses = herança e polimorfismo) ----------
export abstract class RecursoService<T extends Entidade> {
  abstract readonly caminho: string;
  abstract readonly titulo: string;
  abstract readonly campos: CampoConfig[];

  constructor(protected readonly cliente: HttpClient) {}

  listar(pagina: number, limite = 10): Promise<Pagina<T>> {
    return this.cliente.requisitar<Pagina<T>>('GET', `/${this.caminho}?pagina=${pagina}&limite=${limite}`);
  }

  buscar(id: number): Promise<T> {
    return this.cliente.requisitar<T>('GET', `/${this.caminho}/${id}`);
  }

  criar(dados: Record<string, unknown> | FormData): Promise<T> {
    return this.cliente.requisitar<T>('POST', `/${this.caminho}`, dados);
  }

  atualizar(id: number, dados: Record<string, unknown> | FormData): Promise<T> {
    const metodo = dados instanceof FormData && this.caminho === 'produtos' ? 'POST' : 'PUT';
    return this.cliente.requisitar<T>(metodo, `/${this.caminho}/${id}`, dados);
  }

  excluir(id: number): Promise<{ mensagem: string }> {
    return this.cliente.requisitar<{ mensagem: string }>('DELETE', `/${this.caminho}/${id}`);
  }
}

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

export function finalizarCheckout(itens: { produto_id: number; quantidade: number; parcelas: number }[], chave: string): Promise<CheckoutResposta> {
  return http.requisitar<CheckoutResposta>('POST', '/pedidos/checkout', { itens, chave });
}

// Registro usado pelas telas genéricas: a rota /:recurso escolhe o serviço aqui.
export const servicos: Record<string, RecursoService<Entidade>> = {
  categorias: new CategoriaService(http),
  produtos: new ProdutoService(http),
  pedidos: new PedidoService(http),
  'itens-pedido': new ItemPedidoService(http),
};
