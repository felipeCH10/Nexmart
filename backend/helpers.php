<?php

function conectar(): PDO
{
    $host = getenv('DB_HOST');
    $nome = getenv('DB_NAME');
    $dsn = "mysql:host=$host;dbname=$nome;charset=utf8mb4";

    return new PDO($dsn, getenv('DB_USER'), getenv('DB_PASS'), [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);
}

function responder(int $status, $dados): never
{
    http_response_code($status);
    echo json_encode($dados, JSON_UNESCAPED_UNICODE);
    exit;
}

function erro(int $status, string $mensagem, array $campos = []): never
{
    responder($status, ['erro' => $mensagem, 'campos' => (object) $campos]);
}

function lerJson(): array
{
    $dados = json_decode(file_get_contents('php://input'), true);
    if (!is_array($dados)) {
        erro(400, 'Corpo da requisição inválido (JSON esperado).');
    }
    return $dados;
}


function base64url(string $texto): string
{
    return rtrim(strtr(base64_encode($texto), '+/', '-_'), '=');
}

function jwtCriar(int $id, string $email): string
{
    $cabecalho = base64url(json_encode(['alg' => 'HS256', 'typ' => 'JWT']));
    $corpo = base64url(json_encode(['sub' => $id, 'email' => $email, 'exp' => time() + 7200]));
    $assinatura = base64url(hash_hmac('sha256', "$cabecalho.$corpo", getenv('JWT_SECRET'), true));
    return "$cabecalho.$corpo.$assinatura";
}

function jwtValidar(string $token): ?array
{
    $partes = explode('.', $token);
    if (count($partes) !== 3) {
        return null;
    }
    [$cabecalho, $corpo, $assinatura] = $partes;
    $esperada = base64url(hash_hmac('sha256', "$cabecalho.$corpo", getenv('JWT_SECRET'), true));
    if (!hash_equals($esperada, $assinatura)) {
        return null;
    }
    $dados = json_decode(base64_decode(strtr($corpo, '-_', '+/')), true);
    if (!is_array($dados) || ($dados['exp'] ?? 0) < time()) {
        return null;
    }
    return $dados;
}

function exigirLogin(): int
{
    $cabecalho = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';
    if (!preg_match('/^Bearer\s+(.+)$/', $cabecalho, $m)) {
        erro(401, 'Token não informado.');
    }
    $dados = jwtValidar($m[1]);
    if ($dados === null) {
        erro(401, 'Token inválido ou expirado.');
    }
    return (int) $dados['sub'];
}


function validarEmail($email): bool
{
    return is_string($email) && preg_match('/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/', $email) === 1;
}

function validarSenha($senha): bool
{
    return is_string($senha) && preg_match('/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/', $senha) === 1;
}

function validarCpf($cpf): bool
{
    $cpf = preg_replace('/\D/', '', (string) $cpf);
    if (strlen($cpf) !== 11 || preg_match('/^(\d)\1{10}$/', $cpf)) {
        return false;
    }
    for ($t = 9; $t < 11; $t++) {
        $soma = 0;
        for ($i = 0; $i < $t; $i++) {
            $soma += $cpf[$i] * (($t + 1) - $i);
        }
        $digito = ((10 * $soma) % 11) % 10;
        if ((int) $cpf[$t] !== $digito) {
            return false;
        }
    }
    return true;
}

function validarCampos(array $regras, array $dados): array
{
    $valores = [];
    $erros = [];

    foreach ($regras as $campo => $regra) {
        $v = $dados[$campo] ?? null;
        if (is_string($v)) {
            $v = trim($v);
        }

        if ($v === null || $v === '') {
            if ($regra['obrigatorio'] ?? true) {
                $erros[$campo] = 'Campo obrigatório.';
            } else {
                $valores[$campo] = null;
            }
            continue;
        }

        switch ($regra['tipo']) {
            case 'texto':
                if (!is_string($v) || mb_strlen($v) > ($regra['max'] ?? 255)) {
                    $erros[$campo] = 'Texto inválido ou muito longo.';
                }
                break;
            case 'inteiro':
                if (filter_var($v, FILTER_VALIDATE_INT) === false || (int) $v < ($regra['min'] ?? 0)) {
                    $erros[$campo] = 'Informe um número inteiro válido.';
                } else {
                    $v = (int) $v;
                }
                break;
            case 'decimal':
                if (!is_numeric($v) || (float) $v < 0) {
                    $erros[$campo] = 'Informe um valor numérico válido.';
                }
                break;
            case 'opcoes':
                if (!in_array($v, $regra['opcoes'], true)) {
                    $erros[$campo] = 'Valor não permitido.';
                }
                break;
        }

        if (!isset($erros[$campo])) {
            $valores[$campo] = $v;
        }
    }

    return [$valores, $erros];
}
