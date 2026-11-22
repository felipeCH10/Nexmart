export class TokenInvalidoError extends Error {
  constructor() {
    super('Token de autenticação inválido.');
    this.name = 'TokenInvalidoError';
  }
}
