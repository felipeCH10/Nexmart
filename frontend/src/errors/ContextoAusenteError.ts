export class ContextoAusenteError extends Error {
  constructor(nome: string) {
    super(`${nome} deve ser usado dentro do provider.`);
    this.name = 'ContextoAusenteError';
  }
}
