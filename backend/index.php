<?php
// Roteador da API. O Nginx remove o prefixo /api, então aqui as rotas começam em /auth, /usuarios, /categorias...
require '/var/www/app/helpers.php';

header('Content-Type: application/json; charset=utf-8');

// Os 4 CRUDs (fora usuários). Os nomes de tabela/coluna vêm daqui, nunca do usuário.
$recursos = [
    'categorias' => [
        'tabela' => 'categorias',
        'campos' => [
            'nome' => ['tipo' => 'texto', 'max' => 100],
            'descricao' => ['tipo' => 'texto', 'obrigatorio' => false],
        ],
    ],
    'produtos' => [
        'tabela' => 'produtos',
        'campos' => [
            'nome' => ['tipo' => 'texto', 'max' => 100],
            'preco' => ['tipo' => 'decimal'],
            'estoque' => ['tipo' => 'inteiro', 'min' => 0],
            'categoria_id' => ['tipo' => 'inteiro', 'min' => 1],
            'parcelas_sem_juros' => ['tipo' => 'inteiro', 'min' => 1],
            'parcelas_com_juros' => ['tipo' => 'inteiro', 'min' => 1],
            'imagem' => ['tipo' => 'texto', 'max' => 255],
        ],
    ],
    'pedidos' => [
        'tabela' => 'pedidos',
        'dono' => true, // grava usuario_id do usuário logado
        'campos' => [
            'cliente' => ['tipo' => 'texto', 'max' => 100],
            'status' => ['tipo' => 'opcoes', 'opcoes' => ['aberto', 'pago', 'cancelado']],
        ],
    ],
    'itens-pedido' => [
        'tabela' => 'itens_pedido',
        'campos' => [
            'pedido_id' => ['tipo' => 'inteiro', 'min' => 1],
            'produto_id' => ['tipo' => 'inteiro', 'min' => 1],
            'quantidade' => ['tipo' => 'inteiro', 'min' => 1],
            'preco_unitario' => ['tipo' => 'decimal'],
        ],
    ],
];

$metodo = $_SERVER['REQUEST_METHOD'];
$caminho = trim(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH), '/');
$partes = $caminho === '' ? [] : explode('/', $caminho);

function taxaJurosPorPreco(float $preco): float
{
    if ($preco <= 100) return 0.05;
    if ($preco <= 400) return 0.025;
    return 0.01;
}

try {
    $pdo = conectar();

    if (count($partes) === 3 && $partes[0] === 'imagens' && $partes[1] === 'produtos' && $metodo === 'GET') {
        $stmt = $pdo->prepare('SELECT imagem_blob, imagem_mime FROM produtos WHERE id = :id');
        $stmt->execute([':id' => (int) $partes[2]]);
        $imagem = $stmt->fetch();
        if (!$imagem || $imagem['imagem_blob'] === null) erro(404, 'Imagem não encontrada.');
        header('Content-Type: ' . $imagem['imagem_mime']);
        echo $imagem['imagem_blob'];
        exit;
    }

    // ---------- AUTENTICAÇÃO ----------
    if ($partes === ['auth', 'login'] && $metodo === 'POST') {
        $dados = lerJson();
        $email = trim((string) ($dados['email'] ?? ''));
        $senha = (string) ($dados['senha'] ?? '');

        if (!validarEmail($email) || $senha === '') {
            erro(422, 'Informe um e-mail válido e a senha.');
        }

        $stmt = $pdo->prepare('SELECT id, nome, email, cpf, senha_hash FROM usuarios WHERE email = :email');
        $stmt->execute([':email' => $email]);
        $usuario = $stmt->fetch();

        // Mesma mensagem para e-mail inexistente e senha errada
        if (!$usuario || !password_verify($senha, $usuario['senha_hash'])) {
            erro(401, 'E-mail ou senha incorretos.');
        }

        unset($usuario['senha_hash']);
        responder(200, ['token' => jwtCriar((int) $usuario['id'], $usuario['email']), 'usuario' => $usuario]);
    }

    if ($partes === ['auth', 'cadastro'] && $metodo === 'POST') {
        $dados = lerJson();
        $erros = [];
        $nome = trim((string) ($dados['nome'] ?? ''));
        $email = trim((string) ($dados['email'] ?? ''));
        $cpf = preg_replace('/\D/', '', (string) ($dados['cpf'] ?? ''));
        $senha = (string) ($dados['senha'] ?? '');

        if ($nome === '' || mb_strlen($nome) > 100) $erros['nome'] = 'Nome obrigatório (até 100 caracteres).';
        if (!validarEmail($email)) $erros['email'] = 'E-mail inválido.';
        if (!validarCpf($cpf)) $erros['cpf'] = 'CPF inválido.';
        if (!validarSenha($senha)) $erros['senha'] = 'Senha fraca: mínimo 8 caracteres com maiúscula, minúscula, número e símbolo.';
        if ($erros) erro(422, 'Dados inválidos.', $erros);

        $stmt = $pdo->prepare('SELECT email, cpf FROM usuarios WHERE email = :email OR cpf = :cpf');
        $stmt->execute([':email' => $email, ':cpf' => $cpf]);
        foreach ($stmt->fetchAll() as $existente) {
            if ($existente['email'] === $email) $erros['email'] = 'E-mail já cadastrado.';
            if ($existente['cpf'] === $cpf) $erros['cpf'] = 'CPF já cadastrado.';
        }

        if ($erros) erro(409, 'Usuário já existe.', $erros);

        $stmt = $pdo->prepare('INSERT INTO usuarios (nome, email, cpf, senha_hash) VALUES (:nome, :email, :cpf, :hash)');
        $stmt->execute([
            ':nome' => $nome,
            ':email' => $email,
            ':cpf' => $cpf,
            ':hash' => password_hash($senha, PASSWORD_DEFAULT),
        ]);
        responder(201, ['mensagem' => 'Usuário cadastrado com sucesso.']);
    }

    // ---------- A PARTIR DAQUI TUDO EXIGE TOKEN ----------
    $usuarioId = exigirLogin();

    // Produtos com imagem usam multipart/form-data, mas continuam no mesmo serviço.
    if (($partes[0] ?? null) === 'produtos' && in_array($metodo, ['POST', 'PUT'], true)) {
        $idProduto = isset($partes[1]) ? (int) $partes[1] : null;
        if ($metodo === 'PUT' && (!$idProduto || count($partes) !== 2)) erro(404, 'Produto não encontrado.');
        if ($metodo === 'PUT') {
            $existencia = $pdo->prepare('SELECT id FROM produtos WHERE id = :id');
            $existencia->execute([':id' => $idProduto]);
            if (!$existencia->fetch()) erro(404, 'Produto não encontrado.');
        }

        $dados = $_POST;
        $arquivo = $_FILES['foto'] ?? null;
        $erros = [];
        foreach (['nome', 'preco', 'estoque', 'categoria_id', 'parcelas_sem_juros', 'parcelas_com_juros'] as $campo) {
            if (!isset($dados[$campo]) || trim((string) $dados[$campo]) === '') $erros[$campo] = 'Campo obrigatório.';
        }
        $preco = filter_var($dados['preco'] ?? null, FILTER_VALIDATE_FLOAT);
        $estoque = filter_var($dados['estoque'] ?? null, FILTER_VALIDATE_INT);
        $categoriaId = filter_var($dados['categoria_id'] ?? null, FILTER_VALIDATE_INT);
        $parcelasSemJuros = filter_var($dados['parcelas_sem_juros'] ?? null, FILTER_VALIDATE_INT);
        $parcelasComJuros = filter_var($dados['parcelas_com_juros'] ?? null, FILTER_VALIDATE_INT);
        if ($preco === false || $preco <= 0) $erros['preco'] = 'O preço deve ser maior que zero.';
        if ($estoque === false || $estoque < 0) $erros['estoque'] = 'O estoque não pode ser negativo.';
        if ($categoriaId === false || $categoriaId < 1) $erros['categoria_id'] = 'Categoria inválida.';
        if ($parcelasSemJuros === false || $parcelasSemJuros < 1) $erros['parcelas_sem_juros'] = 'Informe ao menos uma parcela.';
        if ($parcelasComJuros === false || $parcelasComJuros < 1) $erros['parcelas_com_juros'] = 'Informe ao menos uma parcela.';
        if ($parcelasSemJuros !== false && $parcelasComJuros !== false && $parcelasSemJuros > $parcelasComJuros) {
            $erros['parcelas_sem_juros'] = 'Parcelas sem juros não podem superar o limite total.';
        }
        if ($arquivo && $arquivo['error'] !== UPLOAD_ERR_OK) $erros['imagem'] = 'Falha no upload da imagem.';
        if ($arquivo && $arquivo['size'] > 5 * 1024 * 1024) $erros['imagem'] = 'A imagem deve ter no máximo 5 MB.';
        if ($erros) erro(422, 'Dados inválidos.', $erros);
        $categoria = $pdo->prepare('SELECT id FROM categorias WHERE id = :id');
        $categoria->execute([':id' => $categoriaId]);
        if (!$categoria->fetchColumn()) erro(422, 'Dados inválidos.', ['categoria_id' => 'Categoria não encontrada.']);

        $imagem = $arquivo ? file_get_contents($arquivo['tmp_name']) : null;
        $mime = $arquivo ? (new finfo(FILEINFO_MIME_TYPE))->file($arquivo['tmp_name']) : null;
        if ($arquivo && !in_array($mime, ['image/jpeg', 'image/png', 'image/gif', 'image/webp'], true)) {
            erro(422, 'Formato de imagem inválido.', ['imagem' => 'Use JPG, PNG, GIF ou WebP.']);
        }

        $atualizaProduto = $idProduto !== null;
        if (!$atualizaProduto) {
            $stmt = $pdo->prepare('INSERT INTO produtos (nome, preco, estoque, categoria_id, parcelas_sem_juros, parcelas_com_juros, imagem_blob, imagem_mime) VALUES (:nome, :preco, :estoque, :categoria_id, :parcelas_sem_juros, :parcelas_com_juros, :imagem, :mime)');
            $stmt->bindValue(':imagem', $imagem, PDO::PARAM_LOB);
            $stmt->bindValue(':mime', $mime, PDO::PARAM_STR);
        } else {
            $stmt = $pdo->prepare($arquivo
                ? 'UPDATE produtos SET nome=:nome, preco=:preco, estoque=:estoque, categoria_id=:categoria_id, parcelas_sem_juros=:parcelas_sem_juros, parcelas_com_juros=:parcelas_com_juros, imagem_blob=:imagem, imagem_mime=:mime WHERE id=:id'
                : 'UPDATE produtos SET nome=:nome, preco=:preco, estoque=:estoque, categoria_id=:categoria_id, parcelas_sem_juros=:parcelas_sem_juros, parcelas_com_juros=:parcelas_com_juros WHERE id=:id');
            $stmt->bindValue(':id', $idProduto, PDO::PARAM_INT);
            if ($arquivo) {
                $stmt->bindValue(':imagem', $imagem, PDO::PARAM_LOB);
                $stmt->bindValue(':mime', $mime, PDO::PARAM_STR);
            }
        }
        $stmt->bindValue(':nome', trim((string) $dados['nome']));
        $stmt->bindValue(':preco', (float) $dados['preco']);
        $stmt->bindValue(':estoque', (int) $dados['estoque'], PDO::PARAM_INT);
        $stmt->bindValue(':categoria_id', (int) $dados['categoria_id'], PDO::PARAM_INT);
        $stmt->bindValue(':parcelas_sem_juros', (int) $dados['parcelas_sem_juros'], PDO::PARAM_INT);
        $stmt->bindValue(':parcelas_com_juros', (int) $dados['parcelas_com_juros'], PDO::PARAM_INT);
        $stmt->execute();
        $novoId = $idProduto ?? (int) $pdo->lastInsertId();
        $resposta = $pdo->prepare('SELECT id, nome, preco, estoque, categoria_id, parcelas_sem_juros, parcelas_com_juros, CONCAT("/api/imagens/produtos/", id) AS imagem FROM produtos WHERE id=:id');
        $resposta->execute([':id' => $novoId]);
        responder($atualizaProduto ? 200 : 201, $resposta->fetch());
    }

    // Checkout consulta preço/estoque no banco e grava pedido e itens atomicamente.
    if ($partes === ['pedidos', 'checkout'] && $metodo === 'POST') {
        $dados = lerJson();
        $itensRecebidos = $dados['itens'] ?? null;
        $chaveCheckout = trim((string) ($dados['chave'] ?? ''));
        if (!preg_match('/^[A-Za-z0-9_-]{16,80}$/', $chaveCheckout)) {
            erro(422, 'Chave de checkout inválida.');
        }
        if (!is_array($itensRecebidos) || count($itensRecebidos) === 0) erro(422, 'O carrinho está vazio.');
        $existente = $pdo->prepare('SELECT id FROM pedidos WHERE usuario_id = :usuario_id AND checkout_chave = :chave');
        $existente->execute([':usuario_id' => $usuarioId, ':chave' => $chaveCheckout]);
        if ($pedidoExistente = $existente->fetchColumn()) {
            $totalExistente = $pdo->prepare('SELECT COALESCE(SUM(quantidade * preco_unitario), 0) FROM itens_pedido WHERE pedido_id = :pedido_id');
            $totalExistente->execute([':pedido_id' => $pedidoExistente]);
            responder(200, [
                'mensagem' => 'Pedido já confirmado.',
                'pedido_id' => (int) $pedidoExistente,
                'itens' => [],
                'total' => (float) $totalExistente->fetchColumn(),
            ]);
        }
        $pdo->beginTransaction();
        try {
            $itens = [];
            foreach ($itensRecebidos as $item) {
                if (!is_array($item)) erro(422, 'Item de carrinho inválido.');
                $produtoId = filter_var($item['produto_id'] ?? null, FILTER_VALIDATE_INT);
                $quantidade = filter_var($item['quantidade'] ?? null, FILTER_VALIDATE_INT);
                $parcelas = filter_var($item['parcelas'] ?? null, FILTER_VALIDATE_INT);
                if ($produtoId === false || $produtoId < 1 || $quantidade === false || $quantidade < 1 || $parcelas === false || $parcelas < 1) {
                    erro(422, 'Produto ou quantidade inválida.');
                }
                $produto = $pdo->prepare('SELECT id, preco, estoque, parcelas_sem_juros, parcelas_com_juros FROM produtos WHERE id = :id FOR UPDATE');
                $produto->execute([':id' => $produtoId]);
                $produto = $produto->fetch();
                if (!$produto || (int) $produto['estoque'] < $quantidade) {
                    erro(409, 'Estoque insuficiente para um dos produtos.');
                }
                if ($parcelas > (int) $produto['parcelas_com_juros']) {
                    erro(422, 'Quantidade de parcelas acima do limite do produto.');
                }
                $preco = (float) $produto['preco'];
                $totalUnitario = $parcelas > (int) $produto['parcelas_sem_juros']
                    ? $preco * (1 + $parcelas * taxaJurosPorPreco($preco))
                    : $preco;
                $itens[] = [
                    'produto_id' => $produtoId,
                    'quantidade' => $quantidade,
                    'parcelas' => $parcelas,
                    'preco' => $totalUnitario,
                ];
            }
            $pedido = $pdo->prepare("INSERT INTO pedidos (cliente, status, usuario_id, checkout_chave) VALUES (:cliente, 'aberto', :usuario_id, :chave)");
            $pedido->execute([':cliente' => 'Pedido de usuário ' . $usuarioId, ':usuario_id' => $usuarioId, ':chave' => $chaveCheckout]);
            $pedidoId = (int) $pdo->lastInsertId();
            $total = 0.0;
            foreach ($itens as $item) {
                $inserir = $pdo->prepare('INSERT INTO itens_pedido (pedido_id, produto_id, quantidade, preco_unitario, parcelas) VALUES (:pedido_id, :produto_id, :quantidade, :preco, :parcelas)');
                $inserir->execute([':pedido_id' => $pedidoId, ':produto_id' => $item['produto_id'], ':quantidade' => $item['quantidade'], ':preco' => $item['preco'], ':parcelas' => $item['parcelas']]);
                $estoque = $pdo->prepare('UPDATE produtos SET estoque = estoque - :quantidade WHERE id = :id AND estoque >= :quantidade');
                $estoque->execute([':quantidade' => $item['quantidade'], ':id' => $item['produto_id']]);
                if ($estoque->rowCount() !== 1) erro(409, 'Estoque insuficiente para um dos produtos.');
                $total += (float) $item['preco'] * $item['quantidade'];
            }
            $pdo->commit();
            responder(201, ['mensagem' => 'Pedido confirmado.', 'pedido_id' => $pedidoId, 'itens' => $itens, 'total' => $total]);
        } catch (Throwable $e) {
            if ($pdo->inTransaction()) $pdo->rollBack();
            if ($e instanceof PDOException) throw $e;
            throw $e;
        }
    }

    // ---------- USUÁRIO ----------
    if ($partes === ['usuarios', 'me'] && $metodo === 'GET') {
        $stmt = $pdo->prepare('SELECT id, nome, email, cpf FROM usuarios WHERE id = :id');
        $stmt->execute([':id' => $usuarioId]);
        $usuario = $stmt->fetch();
        if (!$usuario) erro(401, 'Usuário do token não existe mais.');
        responder(200, $usuario);
    }

    if (count($partes) === 2 && $partes[0] === 'usuarios' && $metodo === 'PUT') {
        $id = (int) $partes[1];
        if ($id !== $usuarioId) {
            erro(403, 'Você só pode editar o seu próprio usuário.');
        }

        $stmt = $pdo->prepare('SELECT id, nome, email, cpf FROM usuarios WHERE id = :id');
        $stmt->execute([':id' => $id]);
        $atual = $stmt->fetch();
        if (!$atual) erro(404, 'Usuário não encontrado.');

        $dados = lerJson();
        $erros = [];
        $nome = trim((string) ($dados['nome'] ?? ''));
        $email = trim((string) ($dados['email'] ?? ''));
        $cpf = preg_replace('/\D/', '', (string) ($dados['cpf'] ?? ''));
        $senha = (string) ($dados['senha'] ?? '');

        if ($nome === '' || mb_strlen($nome) > 100) $erros['nome'] = 'Nome obrigatório (até 100 caracteres).';
        if ($email === '') $erros['email'] = 'Campo obrigatório.';
        elseif ($email !== $atual['email']) $erros['email'] = 'O e-mail não pode ser alterado.';
        if (!validarCpf($cpf)) $erros['cpf'] = 'CPF inválido.';
        if (!validarSenha($senha)) $erros['senha'] = 'Senha fraca: mínimo 8 caracteres com maiúscula, minúscula, número e símbolo.';
        if ($erros) erro(422, 'Dados inválidos.', $erros);

        $stmt = $pdo->prepare('SELECT id FROM usuarios WHERE cpf = :cpf AND id <> :id');
        $stmt->execute([':cpf' => $cpf, ':id' => $id]);
        if ($stmt->fetch()) erro(409, 'CPF já cadastrado.', ['cpf' => 'CPF já cadastrado.']);

        // O e-mail não entra no UPDATE: é imutável também no banco.
        $stmt = $pdo->prepare('UPDATE usuarios SET nome = :nome, cpf = :cpf, senha_hash = :hash WHERE id = :id');
        $stmt->execute([
            ':nome' => $nome,
            ':cpf' => $cpf,
            ':hash' => password_hash($senha, PASSWORD_DEFAULT),
            ':id' => $id,
        ]);
        responder(200, ['id' => $id, 'nome' => $nome, 'email' => $atual['email'], 'cpf' => $cpf]);
    }

    // ---------- CRUDs GENÉRICOS ----------
    if (isset($partes[0], $recursos[$partes[0]]) && count($partes) <= 2) {
        $cfg = $recursos[$partes[0]];
        $tabela = $cfg['tabela'];
        $id = isset($partes[1]) ? (int) $partes[1] : null;

        // LISTAR (com paginação)
        if ($id === null && $metodo === 'GET') {
            $pagina = max(1, (int) ($_GET['pagina'] ?? 1));
            $limite = min(100, max(1, (int) ($_GET['limite'] ?? 10)));
            $offset = ($pagina - 1) * $limite;

            $select = $tabela === 'produtos'
                ? 'id, nome, preco, estoque, categoria_id, parcelas_sem_juros, parcelas_com_juros, CONCAT("/api/imagens/produtos/", id) AS imagem'
                : '*';
            $filtroDono = '';
            $parametros = [];
            if ($tabela === 'pedidos') {
                $filtroDono = ' WHERE usuario_id = :usuario_id';
                $parametros[':usuario_id'] = $usuarioId;
            } elseif ($tabela === 'itens_pedido') {
                $filtroDono = ' WHERE pedido_id IN (SELECT id FROM pedidos WHERE usuario_id = :usuario_id)';
                $parametros[':usuario_id'] = $usuarioId;
            }
            $totalStmt = $pdo->prepare("SELECT COUNT(*) FROM $tabela$filtroDono");
            $totalStmt->execute($parametros);
            $total = (int) $totalStmt->fetchColumn();

            $stmt = $pdo->prepare("SELECT $select FROM $tabela$filtroDono ORDER BY id DESC LIMIT :limite OFFSET :offset");
            foreach ($parametros as $nome => $valor) $stmt->bindValue($nome, $valor, PDO::PARAM_INT);
            $stmt->bindValue(':limite', $limite, PDO::PARAM_INT);
            $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
            $stmt->execute();

            responder(200, [
                'dados' => $stmt->fetchAll(),
                'pagina' => $pagina,
                'limite' => $limite,
                'total' => $total,
                'totalPaginas' => max(1, (int) ceil($total / $limite)),
            ]);
        }

        // CADASTRAR
        if ($id === null && $metodo === 'POST') {
            [$valores, $erros] = validarCampos($cfg['campos'], lerJson());
            if ($erros) erro(422, 'Dados inválidos.', $erros);

            if (!empty($cfg['dono'])) {
                $valores['usuario_id'] = $usuarioId;
            }
            if ($tabela === 'pedidos' && ($valores['status'] ?? 'aberto') !== 'aberto') {
                erro(422, 'Novos pedidos devem iniciar com status aberto.', ['status' => 'Status inválido.']);
            }
            if ($tabela === 'itens_pedido') {
                $pedido = $pdo->prepare('SELECT usuario_id, status FROM pedidos WHERE id = :id');
                $pedido->execute([':id' => $valores['pedido_id']]);
                $pedido = $pedido->fetch();
                if (!$pedido || (int) $pedido['usuario_id'] !== $usuarioId) erro(404, 'Pedido não encontrado.');
                if ($pedido['status'] !== 'aberto') erro(409, 'Só é possível adicionar itens a pedidos abertos.');
                $produto = $pdo->prepare('SELECT preco, estoque FROM produtos WHERE id = :id FOR UPDATE');
                $produto->execute([':id' => $valores['produto_id']]);
                $produto = $produto->fetch();
                if (!$produto || (int) $produto['estoque'] < (int) $valores['quantidade']) erro(409, 'Estoque insuficiente ou produto inexistente.');
                $valores['preco_unitario'] = $produto['preco'];
            }
            $colunas = array_keys($valores);
            $sql = "INSERT INTO $tabela (" . implode(', ', $colunas) . ') VALUES (:' . implode(', :', $colunas) . ')';
            $stmt = $pdo->prepare($sql);
            $stmt->execute($valores);
            if ($tabela === 'itens_pedido') {
                $estoque = $pdo->prepare('UPDATE produtos SET estoque = estoque - :quantidade WHERE id = :id');
                $estoque->execute([':quantidade' => $valores['quantidade'], ':id' => $valores['produto_id']]);
            }

            $select = $tabela === 'produtos'
                ? 'id, nome, preco, estoque, categoria_id, parcelas_sem_juros, parcelas_com_juros, CONCAT("/api/imagens/produtos/", id) AS imagem'
                : '*';
            $stmt = $pdo->prepare("SELECT $select FROM $tabela WHERE id = :id");
            $stmt->execute([':id' => $pdo->lastInsertId()]);
            responder(201, $stmt->fetch());
        }

        // Daqui para baixo a rota precisa de um id válido
        if ($id === null || $id < 1) {
            erro(404, 'Rota não encontrada.');
        }

        $select = $tabela === 'produtos'
            ? 'id, nome, preco, estoque, categoria_id, parcelas_sem_juros, parcelas_com_juros, CONCAT("/api/imagens/produtos/", id) AS imagem'
            : '*';
        $stmt = $pdo->prepare("SELECT $select FROM $tabela WHERE id = :id");
        $stmt->execute([':id' => $id]);
        $registro = $stmt->fetch();
        if ($tabela === 'pedidos' && $registro && (int) $registro['usuario_id'] !== $usuarioId) {
            $registro = false;
        }
        if ($tabela === 'itens_pedido' && $registro) {
            $dono = $pdo->prepare('SELECT p.usuario_id FROM pedidos p JOIN itens_pedido i ON i.pedido_id = p.id WHERE i.id = :id');
            $dono->execute([':id' => $id]);
            if ((int) $dono->fetchColumn() !== $usuarioId) $registro = false;
        }

        // BUSCAR POR ID
        if ($metodo === 'GET') {
            if (!$registro) erro(404, 'Registro não encontrado.');
            responder(200, $registro);
        }

        // EDITAR (não edita o que não existe)
        if ($metodo === 'PUT') {
            if (!$registro) erro(404, 'Registro não encontrado.');
            [$valores, $erros] = validarCampos($cfg['campos'], lerJson());
            if ($erros) erro(422, 'Dados inválidos.', $erros);
            if ($tabela === 'pedidos' && ($valores['status'] ?? $registro['status']) !== $registro['status']) {
                erro(422, 'O status do pedido não pode ser alterado por esta operação.');
            }
            if ($tabela === 'itens_pedido') {
                $pedido = $pdo->prepare('SELECT p.status, p.usuario_id, i.produto_id, i.quantidade FROM pedidos p JOIN itens_pedido i ON i.pedido_id = p.id WHERE i.id = :id');
                $pedido->execute([':id' => $id]);
                $pedido = $pedido->fetch();
                if (!$pedido || (int) $pedido['usuario_id'] !== $usuarioId || $pedido['status'] !== 'aberto') erro(409, 'Só é possível alterar itens de pedidos abertos.');
                $valores['produto_id'] = (int) $pedido['produto_id'];
                $valores['pedido_id'] = (int) $registro['pedido_id'];
                $produto = $pdo->prepare('SELECT preco, estoque FROM produtos WHERE id = :id FOR UPDATE');
                $produto->execute([':id' => $valores['produto_id']]);
                $produto = $produto->fetch();
                if (!$produto) erro(404, 'Produto não encontrado.');
                $diferenca = (int) $valores['quantidade'] - (int) $pedido['quantidade'];
                if ($diferenca > (int) $produto['estoque']) erro(409, 'Estoque insuficiente.');
                $valores['preco_unitario'] = $produto['preco'];
                $estoque = $pdo->prepare('UPDATE produtos SET estoque = estoque - :diferenca WHERE id = :id');
                $estoque->execute([':diferenca' => $diferenca, ':id' => $valores['produto_id']]);
            }

            $sets = [];
            foreach (array_keys($valores) as $coluna) {
                $sets[] = "$coluna = :$coluna";
            }
            $valores['id'] = $id;
            $stmt = $pdo->prepare("UPDATE $tabela SET " . implode(', ', $sets) . ' WHERE id = :id');
            $stmt->execute($valores);

            $stmt = $pdo->prepare($tabela === 'produtos'
                ? 'SELECT id, nome, preco, estoque, categoria_id, parcelas_sem_juros, parcelas_com_juros, CONCAT("/api/imagens/produtos/", id) AS imagem FROM produtos WHERE id = :id'
                : "SELECT * FROM $tabela WHERE id = :id");
            $stmt->execute([':id' => $id]);
            responder(200, $stmt->fetch());
        }

        // EXCLUIR (não exclui o que não existe)
        if ($metodo === 'DELETE') {
            if (!$registro) erro(404, 'Registro não encontrado.');
            if ($tabela === 'itens_pedido') {
                $pedido = $pdo->prepare('SELECT p.status, p.usuario_id, i.produto_id, i.quantidade FROM pedidos p JOIN itens_pedido i ON i.pedido_id = p.id WHERE i.id = :id');
                $pedido->execute([':id' => $id]);
                $pedido = $pedido->fetch();
                if (!$pedido || (int) $pedido['usuario_id'] !== $usuarioId || $pedido['status'] !== 'aberto') erro(409, 'Só é possível excluir itens de pedidos abertos.');
                $estoque = $pdo->prepare('UPDATE produtos SET estoque = estoque + :quantidade WHERE id = :id');
                $estoque->execute([':quantidade' => $pedido['quantidade'], ':id' => $pedido['produto_id']]);
            }
            if ($tabela === 'pedidos') {
                $temItens = $pdo->prepare('SELECT 1 FROM itens_pedido WHERE pedido_id = :id LIMIT 1');
                $temItens->execute([':id' => $id]);
                if ($temItens->fetchColumn()) erro(409, 'Pedidos com itens não podem ser excluídos.');
            }
            $stmt = $pdo->prepare("DELETE FROM $tabela WHERE id = :id");
            $stmt->execute([':id' => $id]);
            responder(200, ['mensagem' => 'Registro excluído.']);
        }

        erro(405, 'Método não permitido.');
    }

    erro(404, 'Rota não encontrada.');
} catch (PDOException $e) {
    // 23000 = violação de chave estrangeira / duplicidade
    if ($e->getCode() === '23000') {
        erro(409, 'Operação inválida: registro relacionado inexistente ou em uso por outro registro.');
    }
    error_log($e->getMessage()); // detalhe só no log do servidor, nunca na resposta
    erro(500, 'Erro interno no servidor.');
}
