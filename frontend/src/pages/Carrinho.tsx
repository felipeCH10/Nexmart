import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { finalizarCheckout, mensagemDe } from '../api';
import { useCarrinho } from '../context/CarrinhoContext';
import { Alerta } from '../components/Comuns';
import { calcularParcelamento } from '../utils/parcelamento';

const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export function CarrinhoPage() {
  const { itens, alterarQuantidade, remover, limpar } = useCarrinho();
  const [mensagem, setMensagem] = useState('');
  const [erro, setErro] = useState(false);
  const [finalizando, setFinalizando] = useState(false);
  const [imagensFalhas, setImagensFalhas] = useState<Record<number, boolean>>({});
  const [parcelasEscolhidas, setParcelasEscolhidas] = useState<Record<number, number>>({});
  const chaveCheckout = useRef(crypto.randomUUID().replace(/-/g, ''));
  const total = itens.reduce((soma, item) => {
    const parcelas = parcelasEscolhidas[item.produto.id] ?? item.produto.parcelas_sem_juros;
    return soma + calcularParcelamento(Number(item.produto.preco), parcelas, item.produto.parcelas_sem_juros, item.quantidade).total;
  }, 0);

  async function finalizar() {
    if (finalizando || itens.length === 0) return;
    setFinalizando(true);
    setErro(false);
    try {
      const resposta = await finalizarCheckout(itens.map((item) => ({
        produto_id: item.produto.id,
        quantidade: item.quantidade,
        parcelas: parcelasEscolhidas[item.produto.id] ?? item.produto.parcelas_sem_juros,
      })), chaveCheckout.current);
      limpar();
      chaveCheckout.current = crypto.randomUUID().replace(/-/g, '');
      setMensagem(`${resposta.mensagem} Total confirmado: ${moeda.format(resposta.total)}.`);
    } catch (erro) {
      setErro(true);
      setMensagem(mensagemDe(erro));
    } finally {
      setFinalizando(false);
    }
  }

  return (
    <section className="cartao carrinho-pagina">
      <h1>Seu carrinho</h1>
      {mensagem && <Alerta tipo={erro ? 'erro' : 'sucesso'}>{mensagem}</Alerta>}
      {itens.length === 0 ? <p>Seu carrinho está vazio. <Link to="/catalogo">Ver produtos</Link></p> : (
        <>
          {itens.map((item) => (
            <div className="item-carrinho" key={item.produto.id}>
              <img
                src={imagensFalhas[item.produto.id] ? item.produto.imagem : `/produto-${item.produto.id}.jpg`}
                alt={item.produto.nome}
                onError={() => {
                  if (!imagensFalhas[item.produto.id]) {
                    setImagensFalhas((atuais) => ({ ...atuais, [item.produto.id]: true }));
                  }
                }}
              />
              {(() => {
                const parcelas = parcelasEscolhidas[item.produto.id] ?? item.produto.parcelas_sem_juros;
                const calculoSelecionado = calcularParcelamento(Number(item.produto.preco), parcelas, item.produto.parcelas_sem_juros, item.quantidade);
                return (
                  <div className="item-detalhes">
                    <strong>{item.produto.nome}</strong>
                    <span className="preco-original">{moeda.format(Number(item.produto.preco))}</span>
                    <label className="seletor-parcelas">
                      <span>Parcelamento</span>
                      <select
                        aria-label={`Parcelas de ${item.produto.nome}`}
                        value={parcelasEscolhidas[item.produto.id] ?? item.produto.parcelas_sem_juros}
                        onChange={(e) => setParcelasEscolhidas({ ...parcelasEscolhidas, [item.produto.id]: Number(e.target.value) })}
                      >
                        {Array.from({ length: item.produto.parcelas_com_juros }, (_, indice) => {
                          const parcelas = indice + 1;
                          const calculo = calcularParcelamento(Number(item.produto.preco), parcelas, item.produto.parcelas_sem_juros, item.quantidade);
                          return <option className={calculo.comJuros ? 'parcela-com-juros' : 'parcela-sem-juros'} key={parcelas} value={parcelas}>
                            {parcelas}x de {moeda.format(calculo.valorParcela)} {calculo.comJuros ? 'com juros' : 'sem juros'}
                          </option>;
                        })}
                      </select>
                      <small>{moeda.format(calculoSelecionado.total)} no parcelamento selecionado</small>
                    </label>
                  </div>
                );
              })()}
              <input aria-label={`Quantidade de ${item.produto.nome}`} type="number" min="1" max={item.produto.estoque} value={item.quantidade} onChange={(e) => alterarQuantidade(item.produto.id, Number(e.target.value))} />
              {(() => {
                const parcelas = parcelasEscolhidas[item.produto.id] ?? item.produto.parcelas_sem_juros;
                const calculoSelecionado = calcularParcelamento(Number(item.produto.preco), parcelas, item.produto.parcelas_sem_juros, item.quantidade);
                return <strong>{moeda.format(calculoSelecionado.total)}</strong>;
              })()}
              <button type="button" onClick={() => remover(item.produto.id)}>Remover</button>
            </div>
          ))}
          <div className="total-carrinho"><strong>Total: {moeda.format(total)}</strong><button type="button" disabled={finalizando} onClick={() => void finalizar()}>{finalizando ? 'Finalizando...' : 'Finalizar compra'}</button><button type="button" onClick={limpar}>Limpar</button></div>
        </>
      )}
    </section>
  );
}
