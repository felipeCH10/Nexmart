import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { http } from '../api';
import type { LoginResposta, Usuario } from '../api';

interface AuthValor {
  usuario: Usuario | null;
  carregando: boolean;
  entrar: (email: string, senha: string) => Promise<void>;
  sair: () => void;
  atualizarUsuario: (usuario: Usuario) => void;
}

const AuthContext = createContext<AuthValor | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [carregando, setCarregando] = useState<boolean>(http.autenticado);

  const sair = useCallback(() => {
    http.token = null;
    setUsuario(null);
  }, []);

  useEffect(() => {
    http.aoExpirarSessao = sair;
    if (!http.autenticado) return;
    http
      .requisitar<Usuario>('GET', '/usuarios/me')
      .then(setUsuario)
      .catch(() => sair())
      .finally(() => setCarregando(false));
  }, [sair]);

  const entrar = useCallback(async (email: string, senha: string) => {
    const resposta = await http.requisitar<LoginResposta>('POST', '/auth/login', { email, senha });
    http.token = resposta.token;
    setUsuario(resposta.usuario);
  }, []);

  const valor = useMemo<AuthValor>(
    () => ({ usuario, carregando, entrar, sair, atualizarUsuario: setUsuario }),
    [usuario, carregando, entrar, sair],
  );

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValor {
  const contexto = useContext(AuthContext);
  if (contexto === null) throw new Error('useAuth deve ser usado dentro de AuthProvider');
  return contexto;
}
