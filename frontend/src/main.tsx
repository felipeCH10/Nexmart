import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Comuns';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CarrinhoProvider } from './context/CarrinhoContext';
import { CadastroPage, LoginPage } from './pages/Auth';
import { CatalogPage, CrudFormPage, CrudListaPage } from './pages/Crud';
import { PerfilPage } from './pages/Perfil';
import { CarrinhoPage } from './pages/Carrinho';
import { AnalisePage } from './pages/Analise';
import './index.css';

function AreaLogada() {
  const { usuario, carregando } = useAuth();
  if (carregando) return <p className="cartao">Carregando...</p>;
  if (usuario === null) return <Navigate to="/login" replace />;
  return <Layout />;
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/cadastro" element={<CadastroPage />} />
      <Route element={<AreaLogada />}>
        <Route path="/" element={<Navigate to="/catalogo" replace />} />
        <Route path="/catalogo" element={<CatalogPage />} />
        <Route path="/perfil" element={<PerfilPage />} />
        <Route path="/carrinho" element={<CarrinhoPage />} />
        <Route path="/analise" element={<AnalisePage />} />
        <Route path="/:recurso" element={<CrudListaPage />} />
        <Route path="/:recurso/novo" element={<CrudFormPage />} />
        <Route path="/:recurso/:id/editar" element={<CrudFormPage />} />
      </Route>
    </Routes>
  );
}

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <HashRouter>
      <AuthProvider>
        <CarrinhoProvider>
          <App />
        </CarrinhoProvider>
      </AuthProvider>
    </HashRouter>
  </StrictMode>,
);
