import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { servicos } from '../api';
import { useAuth } from '../context/AuthContext';
import { useCarrinho } from '../context/CarrinhoContext';

// ---------- Campo genérico (input ou select) ----------
interface CampoProps {
  rotulo: string;
  valor: string;
  aoMudar: (valor: string) => void;
  tipo?: string;
  erro?: string;
  somenteLeitura?: boolean;
  opcoes?: { valor: string; texto: string }[];
  passo?: string;
}

export function Campo({ rotulo, valor, aoMudar, tipo = 'text', erro, somenteLeitura, opcoes, passo }: CampoProps) {
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const tipoAtual = tipo === 'password' && mostrarSenha ? 'text' : tipo;

  return (
    <label className="campo">
      <span>{rotulo}</span>
      {opcoes ? (
        <select value={valor} onChange={(e) => aoMudar(e.target.value)}>
          <option value="">Selecione...</option>
          {opcoes.map((o) => (
            <option key={o.valor} value={o.valor}>
              {o.texto}
            </option>
          ))}
        </select>
      ) : (
        <input
          type={tipoAtual}
          step={passo}
          value={valor}
          readOnly={somenteLeitura}
          onChange={(e) => aoMudar(e.target.value)}
        />
      )}
      {tipo === 'password' && (
        <button
          className="botao-senha"
          type="button"
          onClick={() => setMostrarSenha(!mostrarSenha)}
          aria-label={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'}
        >
          {mostrarSenha ? 'Ocultar' : 'Mostrar'}
        </button>
      )}
      {erro && <small className="erro">{erro}</small>}
    </label>
  );
}

// ---------- Mensagem de erro/sucesso ----------
export function Alerta({ tipo, children }: { tipo: 'erro' | 'sucesso'; children: string }) {
  return <p className={`alerta ${tipo}`}>{children}</p>;
}

// ---------- Paginação ----------
interface PaginacaoProps {
  pagina: number;
  totalPaginas: number;
  aoMudar: (pagina: number) => void;
}

export function Paginacao({ pagina, totalPaginas, aoMudar }: PaginacaoProps) {
  return (
    <div className="paginacao">
      <button type="button" disabled={pagina <= 1} onClick={() => aoMudar(pagina - 1)}>
        Anterior
      </button>
      <span>
        Página {pagina} de {totalPaginas}
      </span>
      <button type="button" disabled={pagina >= totalPaginas} onClick={() => aoMudar(pagina + 1)}>
        Próxima
      </button>
    </div>
  );
}

// ---------- Layout da área logada (menu + conteúdo) ----------
export function Layout() {
  const { usuario, sair } = useAuth();
  const navegar = useNavigate();
  const localizacao = useLocation();
  const [busca, setBusca] = useState('');
  const { itens } = useCarrinho();
  const [categorias, setCategorias] = useState<{ id: number; nome: string }[]>([]);
  const [erroCategorias, setErroCategorias] = useState('');

  useEffect(() => {
    const parametros = new URLSearchParams(localizacao.search);
    setBusca(parametros.get('busca') ?? '');
  }, [localizacao.search]);

  useEffect(() => {
    let ativo = true;
    servicos.categorias.listar(1, 100)
      .then((resposta) => {
        if (ativo) setCategorias(resposta.dados as { id: number; nome: string }[]);
      })
      .catch(() => {
        if (ativo) setErroCategorias('Categorias indisponíveis');
      });
    return () => { ativo = false; };
  }, []);

  function aoSair() {
    sair();
    navegar('/login');
  }

  return (
    <>
      <nav className="menu">
        <Link className="marca" to="/catalogo">NEXMART</Link>
        <form className="busca" onSubmit={(e) => { e.preventDefault(); navegar(`/catalogo?busca=${encodeURIComponent(busca)}`); }}>
          <input value={busca} onChange={(e) => { setBusca(e.target.value); navegar(`/catalogo?busca=${encodeURIComponent(e.target.value.trim())}`); }} placeholder="Buscar produtos..." aria-label="Buscar produtos" />
          <button type="submit">Buscar</button>
          {localizacao.pathname === '/catalogo' && busca && <button type="button" onClick={() => { setBusca(''); navegar('/catalogo'); }}>Limpar</button>}
        </form>
        <details className="categorias-menu">
          <summary>Categorias</summary>
          <div className="categorias-lista">
            {erroCategorias && <span>{erroCategorias}</span>}
            {!erroCategorias && categorias.length === 0 && <span>Carregando...</span>}
            {categorias.map((categoria) => <Link key={categoria.id} to={`/catalogo?categoria=${encodeURIComponent(categoria.nome)}`}>{categoria.nome}</Link>)}
          </div>
        </details>
        <Link to="/analise">Análise</Link>
        <Link to="/carrinho">Carrinho ({itens.reduce((total, item) => total + item.quantidade, 0)})</Link>
        {Object.entries(servicos).map(([chave, servico]) => (
          <Link key={chave} to={`/${chave}`}>
            {servico.titulo}
          </Link>
        ))}
        <span className="espaco" />
        <Link to="/perfil">{usuario?.nome}</Link>
        <button type="button" onClick={aoSair}>
          Sair
        </button>
      </nav>
      <main>
        <Outlet />
      </main>
      <footer className="rodape" aria-label="Rodapé da loja">
        <strong>NEXMART</strong>
      </footer>
    </>
  );
}
