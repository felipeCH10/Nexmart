import type { CampoConfig, Categoria } from '../entities/types';
import { RecursoService } from './RecursoService';

export class CategoriaService extends RecursoService<Categoria> {
  readonly caminho = 'categorias';
  readonly titulo = 'Categorias';
  readonly campos: CampoConfig[] = [
    { nome: 'nome', rotulo: 'Nome', tipo: 'texto' },
    { nome: 'descricao', rotulo: 'Descrição', tipo: 'texto', obrigatorio: false },
  ];
}
