import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ApiError, mensagemDe, servicos } from '../api';
import type { CampoConfig, Categoria, Entidade, Produto, RecursoService } from '../api';
import { useCarrinho } from '../context/CarrinhoContext';
import { Alerta, Campo, Paginacao } from '../components/Comuns';
import { calcularParcelamento } from '../utils/parcelamento';

export function CatalogPage() {
  const [params] = useSearchParams();
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [mensagem, setMensagem] = useState('');
  const [mensagemCarrinho, setMensagemCarrinho] = useState('');
  const [imagensFalhas, setImagensFalhas] = useState<Record<number, boolean>>({});
  const [parcelasAbertas, setParcelasAbertas] = useState<Record<number, boolean>>({});
  const { itens: carrinho, adicionar: adicionarProduto } = useCarrinho();
  const busca = (params.get('busca') ?? '').toLocaleLowerCase();
  const categoria = params.get('categoria') ?? '';

  useEffect(() => {
    let ativo = true;
    Promise.all([servicos.produtos.listar(1, 100), servicos.categorias.listar(1, 100)])
      .then(([produtosResposta, categoriasResposta]) => {
        if (!ativo) return;
        setProdutos(produtosResposta.dados as Produto[]);
        setCategorias(categoriasResposta.dados as Categoria[]);
      })
      .catch(() => { if (ativo) setMensagem('Não foi possível carregar o catálogo.'); })
      .finally(() => { if (ativo) setCarregando(false); });
    return () => { ativo = false; };
  }, []);

  useEffect(() => {
    if (!mensagemCarrinho) return;
    const temporizador = window.setTimeout(() => setMensagemCarrinho(''), 3500);
    return () => window.clearTimeout(temporizador);
  }, [mensagemCarrinho]);

  const visiveis = produtos.filter((produto) => {
    const nomeCategoria = categorias.find((item) => item.id === produto.categoria_id)?.nome ?? '';
    return (!busca || produto.nome.toLocaleLowerCase().includes(busca)) &&
      (!categoria || nomeCategoria === categoria);
  });

  function adicionarAoCarrinho(produto: Produto) {
    if (produto.estoque < 1) return;
    adicionarProduto(produto);
    setMensagemCarrinho(`Produto ${produto.nome} adicionado ao carrinho com sucesso.`);
  }

  const unidadesNoCarrinho = carrinho.reduce((total, item) => total + item.quantidade, 0);
  const valorTotal = carrinho.reduce(
    (total, item) => total + Number(item.produto.preco) * item.quantidade,
    0,
  );
  const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
  const imagemUrl = (produto: Produto) => `/produto-${produto.id}.jpg`;

  return (
    <section>
      {mensagemCarrinho && (
        <div className="notificacao-carrinho" role="status">
          <svg aria-hidden="true" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M3 4h2l2.4 11.2a2 2 0 0 0 2 1.6h7.8a2 2 0 0 0 1.9-1.4L21 8H6" />
            <circle cx="10" cy="20" r="1" />
            <circle cx="18" cy="20" r="1" />
            <path d="m9 11 2 2 4-4" />
          </svg>
          <span>{mensagemCarrinho}</span>
          <span className="notificacao-seta" aria-hidden="true">→</span>
          <Link to="/carrinho">Ir para o carrinho</Link>
        </div>
      )}
      <div className="hero">
        <p className="eyebrow">NEXMART</p>
        <h1>Escolhas inteligentes para todos os momentos.</h1>
        <p>Produtos selecionados, preços justos e uma experiência simples.</p>
      </div>
      {mensagem && <p className="alerta" role="status">{mensagem}</p>}
      <div className="catalogo-topo mb-4">
        <div>
          <h2 className="mb-1">Produtos em destaque</h2>
          <span className="text-secondary">{visiveis.length} produtos encontrados</span>
        </div>
        <div className="resumo-carrinho">
          <span>{unidadesNoCarrinho} {unidadesNoCarrinho === 1 ? 'unidade' : 'unidades'} · <strong>{moeda.format(valorTotal)}</strong></span>
          <Link className="botao" to="/carrinho">Ver carrinho</Link>
        </div>
      </div>
      {carregando && <p>Carregando produtos...</p>}
      {!carregando && !mensagem && produtos.length === 0 && <p>Nenhum produto cadastrado.</p>}
      <div className="row g-4">
        {visiveis.map((produto) => (
          <div className="col-12 col-sm-6 col-lg-4" key={produto.id}>
            <article className="produto-card card h-100">
              <div className="produto-card-header">NEXMART</div>
              <div className="produto-imagem">
                <img
                  src={imagensFalhas[produto.id] ? produto.imagem : imagemUrl(produto)}
                  alt={produto.nome}
                  loading="lazy"
                  onError={() => {
                    if (!imagensFalhas[produto.id]) {
                      setImagensFalhas((atuais) => ({ ...atuais, [produto.id]: true }));
                    }
                  }}
                />
                {imagensFalhas[produto.id] && <div className="imagem-indisponivel">Imagem indisponível</div>}
              </div>
              <div className="produto-info card-body d-flex flex-column">
                <h3 className="h5">{produto.nome}</h3>
                <strong className="produto-preco">{moeda.format(Number(produto.preco))}</strong>
                <span className="parcelamento parcela-sem-juros">
                  em até {produto.parcelas_sem_juros}x de {moeda.format(Number(produto.preco) / produto.parcelas_sem_juros)} sem juros
                </span>
                <span className="parcelamento parcela-com-juros">
                  {(() => {
                    const calculo = calcularParcelamento(Number(produto.preco), produto.parcelas_com_juros, produto.parcelas_sem_juros);
                    return `em até ${produto.parcelas_com_juros}x de ${moeda.format(calculo.valorParcela)} com juros (total ${moeda.format(calculo.total)})`;
                  })()}
                </span>
                <span className="estoque">{produto.estoque} disponíveis</span>
                <button className="mt-auto" type="button" disabled={produto.estoque < 1} onClick={() => adicionarAoCarrinho(produto)}>
                  <svg aria-hidden="true" viewBox="0 0 16 16" width="18" height="18" fill="currentColor">
                    <path d="M0 1.5A.5.5 0 0 1 .5 1h1a.5.5 0 0 1 .49.402L2.1 3H14.5a.5.5 0 0 1 .49.598l-1 5A.5.5 0 0 1 13.5 9H4a.5.5 0 0 1-.49-.402L1.59 2H.5a.5.5 0 0 1-.5-.5ZM4.4 8h8.69l.8-4H3.02l1.38 4ZM5 10a1 1 0 1 0 0 2 1 1 0 0 0 0-2Zm7 0a1 1 0 1 0 0 2 1 1 0 0 0 0-2Z" />
                    <path d="M10.5 10.5a.5.5 0 0 1 1 0v3h1a.5.5 0 0 1 0 1h-1v1a.5.5 0 0 1-1 0v-1h-1a.5.5 0 0 1 0-1h1v-3Z" transform="translate(-1 -1)" />
                  </svg>
                  Adicionar ao carrinho
                </button>
                <button
                  className="botao-parcelas"
                  type="button"
                  aria-expanded={parcelasAbertas[produto.id] ?? false}
                  onClick={() => setParcelasAbertas((atuais) => ({ ...atuais, [produto.id]: !atuais[produto.id] }))}
                >
                  {parcelasAbertas[produto.id] ? 'Ocultar parcelas' : 'Ver opções de parcelas'}
                </button>
                {parcelasAbertas[produto.id] && (
                  <div className="simulacao-parcelas" aria-label={`Simulação de parcelas de ${produto.nome}`}>
                    {Array.from({ length: produto.parcelas_com_juros }, (_, indice) => {
                      const parcelas = indice + 1;
                      const calculo = calcularParcelamento(
                        Number(produto.preco),
                        parcelas,
                        produto.parcelas_sem_juros,
                      );
                      return (
                        <span className={calculo.comJuros ? 'parcela-com-juros' : 'parcela-sem-juros'} key={parcelas}>
                          {parcelas}x de {moeda.format(calculo.valorParcela)} {calculo.comJuros ? 'com juros' : 'sem juros'}
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
            </article>
          </div>
        ))}
        {visiveis.length === 0 && produtos.length > 0 && <p className="text-secondary">Nenhum produto encontrado.</p>}
      </div>
    </section>
  );
}
// ================= LISTAGEM (uma tela) =================
export function CrudListaPage() {
  const { recurso = '' } = useParams();
  const servico = servicos[recurso];
  if (!servico) return <Navigate to="/categorias" replace />;
  // key reinicia a página (e a paginação) ao trocar de recurso
  return <Lista key={recurso} recurso={recurso} servico={servico} />;
}

interface ListaProps {
  recurso: string;
  servico: RecursoService<Entidade>;
}

function Lista({ recurso, servico }: ListaProps) {
  const [pagina, setPagina] = useState(1);
  const [dados, setDados] = useState<Entidade[]>([]);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [erro, setErro] = useState('');

  const carregar = useCallback(async () => {
    try {
      const resposta = await servico.listar(pagina);
      setDados(resposta.dados);
      setTotalPaginas(resposta.totalPaginas);
      setErro('');
    } catch (e) {
      setErro(mensagemDe(e));
    }
  }, [servico, pagina]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  async function excluir(id: number) {
    if (!window.confirm(`Excluir o registro #${id}?`)) return;
    try {
      await servico.excluir(id);
      await carregar();
    } catch (e) {
      setErro(mensagemDe(e));
    }
  }

  return (
    <section>
      <div className="topo">
        <h1>{servico.titulo}</h1>
        <Link className="botao" to={`/${recurso}/novo`}>
          Novo
        </Link>
      </div>
      {erro && <Alerta tipo="erro">{erro}</Alerta>}
      <table>
        <thead>
          <tr>
            <th>ID</th>
            {servico.campos.map((c) => (
              <th key={c.nome}>{c.rotulo}</th>
            ))}
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          {dados.map((item) => (
            <tr key={item.id}>
              <td>{item.id}</td>
              {servico.campos.map((c) => (
                <td key={c.nome}>
                  {recurso === 'produtos' && c.nome === 'imagem' && item.imagem ? (
                    <img
                      className="crud-imagem"
                      src={`/produto-${item.id}.jpg`}
                      alt={String(item.nome)}
                      onError={(e) => {
                        e.currentTarget.src = String(item.imagem);
                      }}
                    />
                  ) : (
                    String(item[c.nome] ?? '')
                  )}
                </td>
              ))}
              <td className="acoes">
                <Link to={`/${recurso}/${item.id}/editar`}>Editar</Link>
                <button type="button" onClick={() => void excluir(item.id)}>
                  Excluir
                </button>
              </td>
            </tr>
          ))}
          {dados.length === 0 && (
            <tr>
              <td colSpan={servico.campos.length + 2}>Nenhum registro.</td>
            </tr>
          )}
        </tbody>
      </table>
      <Paginacao pagina={pagina} totalPaginas={totalPaginas} aoMudar={setPagina} />
    </section>
  );
}

// ================= CADASTRO / EDIÇÃO (outra tela) =================
export function CrudFormPage() {
  const { recurso = '', id } = useParams();
  const servico = servicos[recurso];
  if (!servico) return <Navigate to="/categorias" replace />;
  return <Formulario key={`${recurso}-${id ?? 'novo'}`} recurso={recurso} servico={servico} id={id} />;
}

interface FormularioProps extends ListaProps {
  id?: string;
}

type Valores = Record<string, string>;
type Opcoes = Record<string, { valor: string; texto: string }[]>;

function converter(campo: CampoConfig, valor: string): unknown {
  if (valor.trim() === '') return null;
  if (campo.tipo === 'inteiro' || campo.tipo === 'relacao') return Number(valor);
  if (campo.tipo === 'decimal') return Number(valor.replace(',', '.'));
  return valor;
}

function Formulario({ recurso, servico, id }: FormularioProps) {
  const navegar = useNavigate();
  const [valores, setValores] = useState<Valores>({});
  const [opcoes, setOpcoes] = useState<Opcoes>({});
  const [erros, setErros] = useState<Valores>({});
  const [erroApi, setErroApi] = useState('');
  const [foto, setFoto] = useState<File | null>(null);

  // Carrega registro (se for edição) e as opções dos campos de relacionamento
  useEffect(() => {
    async function iniciar() {
      try {
        if (id !== undefined) {
          const registro = await servico.buscar(Number(id));
          const inicial: Valores = {};
          servico.campos.forEach((c) => (inicial[c.nome] = String(registro[c.nome] ?? '')));
          setValores(inicial);
        }
        const carregadas: Opcoes = {};
        for (const c of servico.campos) {
          if (c.relacao) {
            const alvo = servicos[c.relacao.recurso];
            const lista = await alvo.listar(1, 100);
            carregadas[c.nome] = lista.dados.map((item) => ({
              valor: String(item.id),
              texto: `#${item.id} - ${String(item[c.relacao!.exibir])}`,
            }));
          }
        }
        setOpcoes(carregadas);
      } catch (e) {
        setErroApi(mensagemDe(e));
      }
    }
    void iniciar();
  }, [servico, id]);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setErroApi('');

    const novos: Valores = {};
    const corpo: Record<string, unknown> = {};
    for (const c of servico.campos) {
      const valor = valores[c.nome] ?? '';
      if (c.obrigatorio !== false && valor.trim() === '') novos[c.nome] = 'Campo obrigatório.';
      corpo[c.nome] = converter(c, valor);
    }
    setErros(novos);
    if (Object.keys(novos).length > 0) return;

    try {
      if (recurso === 'produtos') {
        const formulario = new FormData();
        Object.entries(corpo).forEach(([chave, valor]) => formulario.append(chave, String(valor ?? '')));
        if (foto) formulario.append('foto', foto);
        if (id === undefined) await servico.criar(formulario);
        else await servico.atualizar(Number(id), formulario);
      } else if (id === undefined) await servico.criar(corpo);
      else await servico.atualizar(Number(id), corpo);
      navegar(`/${recurso}`);
    } catch (err) {
      if (err instanceof ApiError) setErros(err.campos);
      setErroApi(mensagemDe(err));
    }
  }

  function opcoesDe(campo: CampoConfig) {
    if (campo.tipo === 'opcoes') return campo.opcoes?.map((o) => ({ valor: o, texto: o }));
    if (campo.tipo === 'relacao') return opcoes[campo.nome] ?? [];
    return undefined;
  }

  const preco = Number((valores.preco ?? '').replace(',', '.'));
  const parcelasSemJuros = Number(valores.parcelas_sem_juros);
  const parcelasComJuros = Number(valores.parcelas_com_juros);
  const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
  const semJuros = preco > 0 && parcelasSemJuros > 0
    ? calcularParcelamento(preco, parcelasSemJuros, parcelasSemJuros)
    : null;
  const comJuros = preco > 0 && parcelasComJuros > 0
    ? calcularParcelamento(preco, parcelasComJuros, parcelasSemJuros)
    : null;

  return (
    <form className="cartao" onSubmit={enviar}>
      <h1>
        {id === undefined ? 'Novo' : 'Editar'} - {servico.titulo}
      </h1>
      {erroApi && <Alerta tipo="erro">{erroApi}</Alerta>}
      {servico.campos.map((c) => (
        <div key={c.nome}>
          {recurso === 'produtos' && c.nome === 'imagem' ? (
            <label className="campo" htmlFor="foto">
              <span>Imagem do produto</span>
              <input id="foto" name="foto" type="file" accept="image/*" onChange={(e) => setFoto(e.target.files?.[0] ?? null)} />
              {erros.imagem && <small className="erro">{erros.imagem}</small>}
            </label>
          ) : <Campo
            rotulo={c.rotulo}
            tipo={c.tipo === 'inteiro' ? 'number' : c.tipo === 'decimal' ? 'number' : 'text'}
            passo={c.tipo === 'decimal' ? '0.01' : undefined}
            valor={valores[c.nome] ?? ''}
            aoMudar={(v) => setValores({ ...valores, [c.nome]: v })}
            erro={erros[c.nome]}
            opcoes={opcoesDe(c)}
          />}
          {recurso === 'produtos' && c.nome === 'imagem' && valores.imagem && (
            <img className="form-imagem-preview" src={valores.imagem} alt="Prévia do produto" />
          )}
        </div>
      ))}
      {recurso === 'produtos' && preco > 0 && (
        <div className="calculo-parcelas" aria-live="polite">
          <strong>Simulação do parcelamento</strong>
          {parcelasSemJuros > 0 && (
            <span>
              Sem juros: {parcelasSemJuros}x de {moeda.format(semJuros?.valorParcela ?? 0)}
              {' '}· total {moeda.format(semJuros?.total ?? 0)}
            </span>
          )}
          {parcelasComJuros > 0 && (
            <span>
              Com juros: {parcelasComJuros}x de {moeda.format(comJuros?.valorParcela ?? 0)}
              {' '}· total {moeda.format(comJuros?.total ?? 0)}
            </span>
          )}
          <small>O cálculo usa a faixa de juros do preço do produto.</small>
        </div>
      )}
      <div className="acoes">
        <button type="submit">Salvar</button>
        <Link to={`/${recurso}`}>Cancelar</Link>
      </div>
    </form>
  );
}
