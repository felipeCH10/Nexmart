import { useState } from 'react';
import type { FormEvent } from 'react';
import type { ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { ApiError, http, mensagemDe } from '../api';
import { Alerta, Campo } from '../components/Comuns';
import { useAuth } from '../context/AuthContext';
import { lancarSeInvalido, mensagemSenha, validarCpf, validarEmail, ValidacaoError } from '../validators';

function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="auth-pagina">
      <header className="auth-header">NEXMART</header>
      <div className="auth-conteudo">{children}</div>
      <footer className="auth-footer">NEXMART</footer>
    </div>
  );
}

export function LoginPage() {
  const { entrar } = useAuth();
  const navegar = useNavigate();
  const location = useLocation();
  const aviso = (location.state as { mensagem?: string } | null)?.mensagem;

  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erros, setErros] = useState<Record<string, string>>({});
  const [erroApi, setErroApi] = useState('');

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setErroApi('');
    try {
      const novos: Record<string, string> = {};
      if (!validarEmail(email)) novos.email = 'Informe um e-mail válido.';
      if (senha === '') novos.senha = 'Informe a senha.';
      lancarSeInvalido(novos);
      setErros({});
      await entrar(email, senha);
      await Swal.fire({
        title: 'Login realizado!',
        text: 'Senha confirmada com sucesso.',
        icon: 'success',
        confirmButtonColor: '#111',
      });
      navegar('/');
    } catch (err) {
      if (err instanceof ValidacaoError) {
        setErros(err.campos);
        await Swal.fire({
          title: 'Não foi possível entrar',
          text: 'Confira os dados informados.',
          icon: 'error',
          confirmButtonColor: '#111',
        });
      } else {
        const mensagem = mensagemDe(err);
        setErroApi(mensagem);
        await Swal.fire({
          title: 'Erro ao entrar',
          text: mensagem,
          icon: 'error',
          confirmButtonColor: '#111',
        });
      }
    }
  }

  return (
    <AuthLayout>
      <form className="cartao auth-cartao" onSubmit={enviar}>
        <h1>Entrar</h1>
        {aviso && <Alerta tipo="sucesso">{aviso}</Alerta>}
        {erroApi && <Alerta tipo="erro">{erroApi}</Alerta>}
        <Campo rotulo="E-mail" valor={email} aoMudar={setEmail} erro={erros.email} />
        <Campo rotulo="Senha" tipo="password" valor={senha} aoMudar={setSenha} erro={erros.senha} />
        <button type="submit">Entrar</button>
        <p>
          Não tem conta? <Link to="/cadastro">Cadastre-se</Link>
        </p>
      </form>
    </AuthLayout>
  );
}

export function CadastroPage() {
  const navegar = useNavigate();
  const [form, setForm] = useState({ nome: '', email: '', cpf: '', senha: '', confirmar: '' });
  const [erros, setErros] = useState<Record<string, string>>({});
  const [erroApi, setErroApi] = useState('');

  function mudar(campo: keyof typeof form) {
    return (valor: string) => setForm({ ...form, [campo]: valor });
  }

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setErroApi('');
    try {
      const novos: Record<string, string> = {};
      if (form.nome.trim() === '') novos.nome = 'Informe o nome.';
      if (!validarEmail(form.email)) novos.email = 'E-mail inválido.';
      if (!validarCpf(form.cpf)) novos.cpf = 'CPF inválido.';
      const msgSenha = mensagemSenha(form.senha);
      if (msgSenha) novos.senha = msgSenha;
      if (form.senha !== form.confirmar) novos.confirmar = 'As senhas não conferem.';
      lancarSeInvalido(novos);
      setErros({});

      await http.requisitar('POST', '/auth/cadastro', {
        nome: form.nome,
        email: form.email,
        cpf: form.cpf,
        senha: form.senha,
      });
      await Swal.fire({
        title: 'Cadastro realizado!',
        text: 'Sua conta foi criada com sucesso.',
        icon: 'success',
        confirmButtonColor: '#111',
      });
      navegar('/login', { state: { mensagem: 'Cadastro realizado! Faça login.' } });
    } catch (err) {
      if (err instanceof ValidacaoError) {
        setErros(err.campos);
        await Swal.fire({
          title: 'Não foi possível cadastrar',
          text: 'Confira os dados informados.',
          icon: 'error',
          confirmButtonColor: '#111',
        });
      } else {
        if (err instanceof ApiError) setErros(err.campos);
        const mensagem = mensagemDe(err);
        setErroApi(mensagem);
        await Swal.fire({
          title: 'Erro no cadastro',
          text: mensagem,
          icon: 'error',
          confirmButtonColor: '#111',
        });
      }
    }
  }

  return (
    <AuthLayout>
      <form className="cartao auth-cartao" onSubmit={enviar}>
        <h1>Cadastro</h1>
        {erroApi && <Alerta tipo="erro">{erroApi}</Alerta>}
        <Campo rotulo="Nome" valor={form.nome} aoMudar={mudar('nome')} erro={erros.nome} />
        <Campo rotulo="E-mail" valor={form.email} aoMudar={mudar('email')} erro={erros.email} />
        <Campo rotulo="CPF" valor={form.cpf} aoMudar={mudar('cpf')} erro={erros.cpf} />
        <Campo rotulo="Senha" tipo="password" valor={form.senha} aoMudar={mudar('senha')} erro={erros.senha} />
        <Campo
          rotulo="Confirmar senha"
          tipo="password"
          valor={form.confirmar}
          aoMudar={mudar('confirmar')}
          erro={erros.confirmar}
        />
        <button type="submit">Cadastrar</button>
        <p>
          Já tem conta? <Link to="/login">Entrar</Link>
        </p>
      </form>
    </AuthLayout>
  );
}
