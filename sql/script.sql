CREATE DATABASE IF NOT EXISTS visitavirtual DEFAULT CHARACTER SET utf8mb4 DEFAULT COLLATE utf8mb4_0900_ai_ci;
USE visitavirtual;

-- DROP TABLE IF EXISTS perfil;
CREATE TABLE perfil (
  id int NOT NULL,
  nome varchar(50) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY nome_UN (nome)
);

-- Manter sincronizado com enums/perfil.ts e models/perfil.ts
INSERT INTO perfil (id, nome) VALUES (1, 'Administrador'), (2, 'Comum');

-- DROP TABLE IF EXISTS usuario;
CREATE TABLE usuario (
  id int NOT NULL AUTO_INCREMENT,
  email varchar(100) NOT NULL,
  nome varchar(100) NOT NULL,
  idperfil int NOT NULL,
  token char(32) DEFAULT NULL,
  criacao datetime NOT NULL,
  exclusao datetime NULL,
  PRIMARY KEY (id),
  UNIQUE KEY usuario_email_UN (email),
  KEY usuario_exclusao_IX (exclusao),
  KEY usuario_idperfil_FK_IX (idperfil),
  CONSTRAINT usuario_idperfil_FK FOREIGN KEY (idperfil) REFERENCES perfil (id) ON DELETE RESTRICT ON UPDATE RESTRICT
);

INSERT INTO usuario (email, nome, idperfil, token, criacao) VALUES ('admin@espm.br', 'Administrador', 1, NULL, NOW());

CREATE TABLE predio (
  id int NOT NULL AUTO_INCREMENT,
  idusuario int NOT NULL,
  nome VARCHAR(50) NOT NULL,
  url VARCHAR(75) NOT NULL,
  criacao datetime NOT NULL,
  exclusao datetime NULL,
  nome_en VARCHAR(50) NULL,
  PRIMARY KEY (id),
  UNIQUE KEY predio_url_UN (url),
  KEY predio_exclusao_IX (exclusao),
  KEY predio_idusuario_exclusao_FK_IX (idusuario, exclusao),
  CONSTRAINT predio_idusuario_FK FOREIGN KEY (idusuario) REFERENCES usuario (id) ON DELETE RESTRICT ON UPDATE RESTRICT
);

CREATE TABLE local (
  id int NOT NULL AUTO_INCREMENT,
  idusuario int NOT NULL,
  nome VARCHAR(50) NOT NULL,
  nome_en VARCHAR(50) NOT NULL,
  rgb VARCHAR(10) NOT NULL,
  nome_curto VARCHAR(50) NOT NULL,
  nome_curto_en VARCHAR(50) NOT NULL,
  descricao TEXT NOT NULL,
  descricao_en TEXT NOT NULL,
  versao INT NOT NULL,
  criacao datetime NOT NULL,
  exclusao datetime NULL,
  PRIMARY KEY (id),
  KEY local_exclusao_IX (exclusao),
  KEY local_idusuario_exclusao_FK_IX (idusuario, exclusao),
  CONSTRAINT local_idusuario_FK FOREIGN KEY (idusuario) REFERENCES usuario (id) ON DELETE RESTRICT ON UPDATE RESTRICT
);

CREATE TABLE predio_local (
  id int NOT NULL AUTO_INCREMENT,
  idpredio int NOT NULL,
  idlocal int NOT NULL,
  ordem int NOT NULL,
  PRIMARY KEY (id),
  KEY predio_local_idpredio_ordem_FK_IX (idpredio, ordem),
  KEY predio_local_idlocal_FK_IX (idlocal),
  CONSTRAINT predio_local_idpredio_FK FOREIGN KEY (idpredio) REFERENCES predio (id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT predio_local_idlocal_FK FOREIGN KEY (idlocal) REFERENCES local (id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE link (
  id int NOT NULL AUTO_INCREMENT,
  idusuario int NOT NULL,
  nome VARCHAR(50) NOT NULL,
  nome_en VARCHAR(50) NOT NULL,
  rgb VARCHAR(10) NOT NULL,
  versao INT NOT NULL,
  criacao datetime NOT NULL,
  exclusao datetime NULL,
  url varchar(150) NOT NULL,
  PRIMARY KEY (id),
  KEY link_exclusao_IX (exclusao),
  KEY link_idusuario_exclusao_FK_IX (idusuario, exclusao),
  CONSTRAINT link_idusuario_FK FOREIGN KEY (idusuario) REFERENCES usuario (id) ON DELETE RESTRICT ON UPDATE RESTRICT
);

CREATE TABLE predio_link (
  id int NOT NULL AUTO_INCREMENT,
  idpredio int NOT NULL,
  idlink int NOT NULL,
  ordem int NOT NULL,
  PRIMARY KEY (id),
  KEY predio_link_idpredio_ordem_FK_IX (idpredio, ordem),
  KEY predio_link_idlink_FK_IX (idlink),
  CONSTRAINT predio_link_idpredio_FK FOREIGN KEY (idpredio) REFERENCES predio (id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT predio_link_idlink_FK FOREIGN KEY (idlink) REFERENCES link (id) ON DELETE CASCADE ON UPDATE CASCADE
);