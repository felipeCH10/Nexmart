import { ApiError } from '../errors/ApiError';

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
    if (this.#token !== null) cabecalhos.Authorization = `Bearer ${this.#token}`;

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
