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
