export class ValidacaoError extends Error {
  constructor(public readonly campos: Record<string, string>) {
    super('Dados inválidos');
    this.name = 'ValidacaoError';
  }
}
