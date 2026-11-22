import type { Entidade, MetodoHttp, Pagina } from '../entities/types';

export interface Repositorio<T extends Entidade> {
  listar(pagina: number, limite: number): Promise<Pagina<T>>;
  buscar(id: number): Promise<T>;
  criar(dados: Record<string, unknown> | FormData): Promise<T>;
  atualizar(id: number, dados: Record<string, unknown> | FormData, metodo?: MetodoHttp): Promise<T>;
  excluir(id: number): Promise<{ mensagem: string }>;
}
