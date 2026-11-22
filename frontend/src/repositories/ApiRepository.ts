import type { HttpClient } from '../services/HttpClient';
import type { Entidade, MetodoHttp, Pagina } from '../entities/types';
import type { Repositorio } from './Repositorio';

export class ApiRepository<T extends Entidade> implements Repositorio<T> {
  constructor(
    private readonly cliente: HttpClient,
    private readonly caminho: string,
  ) {}

  listar(pagina: number, limite: number): Promise<Pagina<T>> {
    return this.cliente.requisitar<Pagina<T>>('GET', `/${this.caminho}?pagina=${pagina}&limite=${limite}`);
  }

  buscar(id: number): Promise<T> {
    return this.cliente.requisitar<T>('GET', `/${this.caminho}/${id}`);
  }

  criar(dados: Record<string, unknown> | FormData): Promise<T> {
    return this.cliente.requisitar<T>('POST', `/${this.caminho}`, dados);
  }

  atualizar(id: number, dados: Record<string, unknown> | FormData, metodo: MetodoHttp = 'PUT'): Promise<T> {
    return this.cliente.requisitar<T>(metodo, `/${this.caminho}/${id}`, dados);
  }

  excluir(id: number): Promise<{ mensagem: string }> {
    return this.cliente.requisitar<{ mensagem: string }>('DELETE', `/${this.caminho}/${id}`);
  }
}
