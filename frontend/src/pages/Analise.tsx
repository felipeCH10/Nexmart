import { useEffect, useMemo, useState } from 'react';
import { servicos } from '../api';
import type { Produto } from '../api';

const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export function AnalisePage() {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [erro, setErro] = useState('');

  useEffect(() => {
    servicos.produtos.listar(1, 100)
      .then((resposta) => setProdutos(resposta.dados as Produto[]))
      .catch(() => setErro('Não foi possível carregar os dados da análise.'));
  }, []);

  const dados = useMemo(() => {
    const precos = produtos.map((produto) => Number(produto.preco)).filter(Number.isFinite);
    if (precos.length === 0) return { media: 0, maior: 0, menor: 0, barras: [], histograma: [] };
    const menor = Math.min(...precos);
    const maior = Math.max(...precos);
    const amplitude = Math.max((maior - menor) / 4, 1);
    const histograma = Array.from({ length: 4 }, (_, indice) => {
      const inicio = menor + indice * amplitude;
      const fim = indice === 3 ? maior : inicio + amplitude;
      return {
        rotulo: `${moeda.format(inicio)} - ${moeda.format(fim)}`,
        total: precos.filter((preco) => preco >= inicio && (indice === 3 ? preco <= fim : preco < fim)).length,
      };
    });
    const ordenados = produtos
      .map((produto) => ({ nome: produto.nome, preco: Number(produto.preco) }))
      .sort((a, b) => b.preco - a.preco)
      .slice(0, 8);
    return {
      media: precos.reduce((total, preco) => total + preco, 0) / precos.length,
      maior,
      menor,
      barras: ordenados,
      histograma,
    };
  }, [produtos]);

  const escala = Math.max(...dados.histograma.map((item) => item.total), 1);

  return (
    <section>
      <div className="hero">
        <p className="eyebrow">PROBABILIDADE E ESTATÍSTICA</p>
        <h1>Visão dos preços do catálogo.</h1>
        <p>Resumo descritivo para apoiar decisões de estoque e posicionamento de produtos.</p>
      </div>
      {erro && <p className="alerta erro">{erro}</p>}
      <div className="metricas">
        <div><span>Preço médio</span><strong>{moeda.format(dados.media)}</strong></div>
        <div><span>Menor preço</span><strong>{moeda.format(dados.menor)}</strong></div>
        <div><span>Maior preço</span><strong>{moeda.format(dados.maior)}</strong></div>
        <div><span>Produtos analisados</span><strong>{produtos.length}</strong></div>
      </div>
      <div className="graficos-grid">
        <article className="grafico-card">
          <h2>Produtos mais caros</h2>
          <p className="texto-grafico">Gráfico de barras: compara o preço dos oito produtos de maior valor.</p>
          <div className="barras" role="img" aria-label="Gráfico de barras de preços">
            {dados.barras.map((item) => (
              <div className="barra-item" key={item.nome}>
                <span title={item.nome}>{item.nome}</span>
                <div className="barra-fundo"><i style={{ width: `${(item.preco / Math.max(dados.maior, 1)) * 100}%` }} /></div>
                <strong>{moeda.format(item.preco)}</strong>
              </div>
            ))}
          </div>
        </article>
        <article className="grafico-card">
          <h2>Distribuição de preços</h2>
          <p className="texto-grafico">Histograma: mostra quantos produtos estão em cada faixa de preço.</p>
          <div className="histograma" role="img" aria-label="Histograma da distribuição de preços">
            {dados.histograma.map((item) => (
              <div className="coluna-item" key={item.rotulo}>
                <strong>{item.total}</strong>
                <div className="coluna-fundo"><i style={{ height: `${(item.total / escala) * 100}%` }} /></div>
                <span>{item.rotulo}</span>
              </div>
            ))}
          </div>
        </article>
      </div>
    </section>
  );
}
