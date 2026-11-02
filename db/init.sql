SET NAMES utf8mb4;
ALTER DATABASE Nexmart CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

CREATE TABLE usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    cpf CHAR(11) NOT NULL UNIQUE,
    senha_hash VARCHAR(255) NOT NULL,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Tabela de auditoria: nunca guarda senha, hash ou token
CREATE TABLE auditoria_usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL,
    acao VARCHAR(20) NOT NULL,
    detalhe VARCHAR(255),
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE categorias (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    descricao VARCHAR(255)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE produtos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    preco DECIMAL(10,2) NOT NULL,
    estoque INT NOT NULL DEFAULT 0,
    parcelas_sem_juros INT NOT NULL DEFAULT 1,
    parcelas_com_juros INT NOT NULL DEFAULT 1,
    categoria_id INT NOT NULL,
    imagem_blob MEDIUMBLOB NULL,
    imagem_mime VARCHAR(100) NULL,
    FOREIGN KEY (categoria_id) REFERENCES categorias(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE pedidos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    cliente VARCHAR(100) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'aberto',
    usuario_id INT NOT NULL,
    checkout_chave VARCHAR(80) NULL,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
    UNIQUE KEY uq_pedido_checkout (usuario_id, checkout_chave)
) ENGINE=InnoDB;

CREATE TABLE itens_pedido (
    id INT AUTO_INCREMENT PRIMARY KEY,
    pedido_id INT NOT NULL,
    produto_id INT NOT NULL,
    quantidade INT NOT NULL,
    preco_unitario DECIMAL(10,2) NOT NULL,
    parcelas INT NOT NULL DEFAULT 1,
    FOREIGN KEY (pedido_id) REFERENCES pedidos(id) ON DELETE CASCADE,
    FOREIGN KEY (produto_id) REFERENCES produtos(id)
) ENGINE=InnoDB;

DELIMITER //

-- Trigger 1: depois que o PHP insere um usuário, o próprio banco registra a criação.
CREATE TRIGGER trg_usuarios_after_insert
AFTER INSERT ON usuarios
FOR EACH ROW
BEGIN
    INSERT INTO auditoria_usuarios (usuario_id, acao, detalhe)
    VALUES (NEW.id, 'CRIACAO', 'usuario cadastrado');
END//

-- Trigger 2: depois de um UPDATE, registra QUAIS campos mudaram (sem gravar valores sensíveis).
CREATE TRIGGER trg_usuarios_after_update
AFTER UPDATE ON usuarios
FOR EACH ROW
BEGIN
    IF NEW.nome <> OLD.nome OR NEW.cpf <> OLD.cpf OR NEW.senha_hash <> OLD.senha_hash THEN
        INSERT INTO auditoria_usuarios (usuario_id, acao, detalhe)
        VALUES (NEW.id, 'ATUALIZACAO', CONCAT_WS(', ',
            IF(NEW.nome <> OLD.nome, 'nome alterado', NULL),
            IF(NEW.cpf <> OLD.cpf, 'cpf alterado', NULL),
            IF(NEW.senha_hash <> OLD.senha_hash, 'senha alterada', NULL)));
    END IF;
END//

DELIMITER ;

INSERT INTO categorias (nome, descricao) VALUES
('Eletrônicos', 'Tecnologia para sua rotina'),
('Moda feminina', 'Estilo e conforto'),
('Moda masculina', 'Peças para todos os momentos'),
('Esportes e fitness', 'Movimento e bem-estar'),
('Casa e decoração', 'Sua casa com mais personalidade'),
('Eletrodomésticos', 'Praticidade para o dia a dia'),
('Beleza e cuidados pessoais', 'Cuidados que fazem bem'),
('Games', 'Diversão para jogar mais'),
('Automotivo', 'Acessórios para seu carro'),
('Bebês e brinquedos', 'Cuidado e diversão'),
('Livros e papelaria', 'Ideias para aprender e criar'),
('Pet shop', 'Tudo para o seu melhor amigo');

INSERT INTO produtos (nome, preco, estoque, categoria_id, parcelas_sem_juros, parcelas_com_juros) VALUES
('Fone Bluetooth NexSound', 149.90, 30, 1, 3, 12),
('Smartwatch Active One', 299.90, 20, 1, 6, 12),
('Jaqueta Urban Glow', 219.90, 15, 2, 4, 10),
('Tênis Street Move', 189.90, 25, 3, 5, 10),
('Kit Fitness Essencial', 119.90, 40, 4, 3, 8),
('Luminária Minimal', 89.90, 18, 5, 2, 6),
('Liquidificador Compacto', 349.90, 12, 6, 10, 12),
('Kit Skincare Daily', 79.90, 35, 7, 2, 6),
('Controle Gamer Pro', 259.90, 22, 8, 6, 12),
('Suporte Veicular Smart', 59.90, 28, 9, 2, 6),
('Blocos Criativos Kids', 69.90, 32, 10, 2, 6),
('Planner Nexmart 2026', 49.90, 50, 11, 2, 4),
('Cama Confort Pet', 99.90, 20, 12, 3, 8);
