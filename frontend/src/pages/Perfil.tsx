import { useState } from 'react';
import type { FormEvent } from 'react';
import { ApiError, http, mensagemDe } from '../api';
import type { Usuario } from '../api';
import { Alerta, Campo } from '../components/Comuns';
import { useAuth } from '../context/AuthContext';
import { lancarSeInvalido, mensagemSenha, validarCpf, ValidacaoError } from '../validators';

export function PerfilPage() {
  const { usuario, atualizarUsuario } = useAuth();
  const [nome, setNome] = useState(usuario?.nome ?? '');
  const [cpf, setCpf] = useState(usuario?.cpf ?? '');
  const [senha, setSenha] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [erros, setErros] = useState<Record<string, string>>({});
  const [mensagem, setMensagem] = useState('');
  const [erroApi, setErroApi] = useState('');

  if (usuario === null) return null;

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setMensagem('');
    setErroApi('');
    try {
      const novos: Record<string, string> = {};
      if (nome.trim() === '') novos.nome = 'Informe o nome.';
      if (!validarCpf(cpf)) novos.cpf = 'CPF inválido.';
      const msgSenha = mensagemSenha(senha);
      if (msgSenha) novos.senha = msgSenha;
      if (senha !== confirmar) novos.confirmar = 'As senhas não conferem.';
      lancarSeInvalido(novos);
      setErros({});

      if (!window.confirm('Confirmar as alterações no seu perfil?')) return;

      const atualizado = await http.requisitar<Usuario>('PUT', `/usuarios/${usuario!.id}`, {
        nome,
        email: usuario!.email,
        cpf,
        senha,
      });
      atualizarUsuario(atualizado);
      setSenha('');
      setConfirmar('');
      setMensagem('Perfil atualizado com sucesso.');
    } catch (err) {
      if (err instanceof ValidacaoError) setErros(err.campos);
      else {
        if (err instanceof ApiError) setErros(err.campos);
        setErroApi(mensagemDe(err));
      }
    }
  }

  return (
    <form className="cartao" onSubmit={enviar}>
      <h1>Meu perfil</h1>
      {mensagem && <Alerta tipo="sucesso">{mensagem}</Alerta>}
      {erroApi && <Alerta tipo="erro">{erroApi}</Alerta>}
      <Campo rotulo="Nome" valor={nome} aoMudar={setNome} erro={erros.nome} />
      <Campo rotulo="E-mail (não pode ser alterado)" valor={usuario.email} aoMudar={() => undefined} somenteLeitura />
      <Campo rotulo="CPF" valor={cpf} aoMudar={setCpf} erro={erros.cpf} />
      <Campo rotulo="Senha" tipo="password" valor={senha} aoMudar={setSenha} erro={erros.senha} />
      <Campo rotulo="Confirmar senha" tipo="password" valor={confirmar} aoMudar={setConfirmar} erro={erros.confirmar} />
      <button type="submit">Salvar alterações</button>
    </form>
  );
}
