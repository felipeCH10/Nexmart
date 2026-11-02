// Validações de UX no navegador. A autoridade final é sempre o PHP.

export class ValidacaoError extends Error {
  constructor(public readonly campos: Record<string, string>) {
    super('Dados inválidos');
    this.name = 'ValidacaoError';
  }
}

export function validarEmail(email: string): boolean {
  return /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(email);
}

export function validarCpf(valor: string): boolean {
  const cpf = valor.replace(/\D/g, '');
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;

  for (let t = 9; t < 11; t++) {
    let soma = 0;
    for (let i = 0; i < t; i++) soma += Number(cpf[i]) * (t + 1 - i);
    const digito = ((10 * soma) % 11) % 10;
    if (Number(cpf[t]) !== digito) return false;
  }
  return true;
}

// Retorna a mensagem de erro, ou null se a senha é forte o bastante.
export function mensagemSenha(senha: string): string | null {
  if (senha.length < 8) return 'A senha deve ter ao menos 8 caracteres.';
  if (!/[a-z]/.test(senha)) return 'Inclua uma letra minúscula.';
  if (!/[A-Z]/.test(senha)) return 'Inclua uma letra maiúscula.';
  if (!/\d/.test(senha)) return 'Inclua um número.';
  if (!/[^A-Za-z0-9]/.test(senha)) return 'Inclua um símbolo (ex.: @, #, !).';
  return null;
}

export function lancarSeInvalido(erros: Record<string, string>): void {
  if (Object.keys(erros).length > 0) throw new ValidacaoError(erros);
}
