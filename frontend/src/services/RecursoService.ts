import type { CampoConfig, Entidade, Pagina } from '../models/types';
import type { HttpClient } from './HttpClient';

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
