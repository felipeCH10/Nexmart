import type { CampoConfig, Entidade, Pagina } from '../entities/types';
import { ApiRepository } from '../repositories/ApiRepository';

export abstract class RecursoService<T extends Entidade> {
  abstract readonly caminho: string;
  abstract readonly titulo: string;
  abstract readonly campos: CampoConfig[];

  private readonly cliente: ConstructorParameters<typeof ApiRepository<T>>[0];

  constructor(cliente: ConstructorParameters<typeof ApiRepository<T>>[0]) {
    this.cliente = cliente;
  }

  private get repositorio(): ApiRepository<T> {
    return new ApiRepository<T>(this.cliente, this.caminho);
  }

  listar(pagina: number, limite = 10): Promise<Pagina<T>> {
    return this.repositorio.listar(pagina, limite);
  }

  buscar(id: number): Promise<T> {
    return this.repositorio.buscar(id);
  }

  criar(dados: Record<string, unknown> | FormData): Promise<T> {
    return this.repositorio.criar(dados);
  }

  atualizar(id: number, dados: Record<string, unknown> | FormData): Promise<T> {
    return this.repositorio.atualizar(id, dados);
  }

  excluir(id: number): Promise<{ mensagem: string }> {
    return this.repositorio.excluir(id);
  }
}
