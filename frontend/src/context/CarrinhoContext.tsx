import { createContext, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { Produto } from '../api';

export interface ItemCarrinho {
  produto: Produto;
  quantidade: number;
}

interface CarrinhoValor {
  itens: ItemCarrinho[];
  adicionar: (produto: Produto) => void;
  alterarQuantidade: (produtoId: number, quantidade: number) => void;
  remover: (produtoId: number) => void;
  limpar: () => void;
}

const chave = 'nexmart-carrinho';
function validarItem(valor: unknown): valor is ItemCarrinho {
  if (!valor || typeof valor !== 'object') return false;
  const item = valor as Partial<ItemCarrinho>;
  const produto = item.produto;
  return Boolean(produto && typeof produto === 'object'
    && Number.isInteger(produto.id)
    && typeof produto.nome === 'string'
    && Number.isFinite(Number(produto.preco))
    && Number.isInteger(Number(produto.estoque))
    && Number.isInteger(item.quantidade)
    && (item.quantidade ?? 0) > 0
    && (item.quantidade ?? 0) <= Number(produto.estoque));
}

const lerInicial = (): ItemCarrinho[] => {
  try {
    const salvo: unknown = JSON.parse(localStorage.getItem(chave) ?? '[]');
    return Array.isArray(salvo) ? salvo.filter(validarItem) : [];
  } catch {
    return [];
  }
};

const CarrinhoContext = createContext<CarrinhoValor | null>(null);

export function CarrinhoProvider({ children }: { children: ReactNode }) {
  const [itens, setItens] = useState<ItemCarrinho[]>(lerInicial);

  function persistir(novos: ItemCarrinho[]) {
    setItens(novos);
    localStorage.setItem(chave, JSON.stringify(novos));
  }

  function adicionar(produto: Produto) {
    const atual = itens.find((item) => item.produto.id === produto.id);
    if ((atual?.quantidade ?? 0) >= produto.estoque) return;
    if (atual) {
      persistir(itens.map((item) => item.produto.id === produto.id
        ? { ...item, quantidade: item.quantidade + 1, produto }
        : item));
    } else {
      persistir([...itens, { produto, quantidade: 1 }]);
    }
  }

  function alterarQuantidade(produtoId: number, quantidade: number) {
    const item = itens.find((atual) => atual.produto.id === produtoId);
    if (!item) return;
    const segura = Math.min(item.produto.estoque, Math.max(1, quantidade));
    persistir(itens.map((atual) => atual.produto.id === produtoId
      ? { ...atual, quantidade: segura }
      : atual));
  }

  function remover(produtoId: number) {
    persistir(itens.filter((item) => item.produto.id !== produtoId));
  }

  const valor = useMemo(() => ({ itens, adicionar, alterarQuantidade, remover, limpar: () => persistir([]) }), [itens]);
  return <CarrinhoContext.Provider value={valor}>{children}</CarrinhoContext.Provider>;
}

export function useCarrinho(): CarrinhoValor {
  const valor = useContext(CarrinhoContext);
  if (!valor) throw new Error('useCarrinho deve ser usado dentro de CarrinhoProvider');
  return valor;
}
