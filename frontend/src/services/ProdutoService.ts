import type { CampoConfig, Produto } from '../entities/types';
import { RecursoService } from './RecursoService';

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

  atualizar(id: number, dados: Record<string, unknown> | FormData): Promise<Produto> {
    const metodo = dados instanceof FormData ? 'POST' : 'PUT';
    return this.repositorio.atualizar(id, dados, metodo);
  }
}
