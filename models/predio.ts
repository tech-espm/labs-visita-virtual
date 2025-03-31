import app = require("teem");
import appsettings = require("../appsettings");
import DataUtil = require("../utils/dataUtil");
import Perfil = require("../enums/perfil");

interface Predio {
	id: number;
	idusuario: number;
	nome: string;
	nome_en: string;
	url: string;
	criacao: string;
	exclusao: string | null;

	// Utilizado apenas para a visita
	locais?: any[] | null;
}

interface PredioLocal {
	id: number;
	idpredio: number;
	idlocal: number;
	ordem: number;
}

class Predio {
	private static validar(predio: Predio, criacao: boolean): string | null {
		if (!predio)
			return "Tour inválido";

		predio.id = parseInt(predio.id as any);

		if (!criacao) {
			if (isNaN(predio.id))
				return "Id inválido";
		}

		predio.idusuario = parseInt(predio.idusuario as any) || 0;

		if (!predio.nome || !(predio.nome = predio.nome.normalize().trim()) || predio.nome.length > 50)
			return "Nome inválido";

		if (!predio.nome_en || !(predio.nome_en = predio.nome_en.normalize().trim()) || predio.nome_en.length > 50)
			return "Nome em Inglês inválido";

		// Limita a URL a 60 caracteres para deixar 15 sobrando, para tentar evitar perda de dados durante a concatenação da exclusão
		if (!predio.url || !(predio.url = predio.url.normalize().trim().toLowerCase()) || predio.url.length > 60)
			return "URL inválida";

		if (predio.locais) {
			if (!Array.isArray(predio.locais))
				predio.locais = [predio.locais];

			for (let i = predio.locais.length - 1; i >= 0; i--) {
				if (!(predio.locais[i] = parseInt(predio.locais[i])))
					return "Local inválido";
			}

			for (let i = predio.locais.length - 1; i >= 0; i--) {
				const idlocal = predio.locais[i];

				for (let j = i - 1; j >= 0; j--) {
					if (predio.locais[j] === idlocal)
						return "Existem locais repetidos";
				}
			}
		} else {
			predio.locais = [];
		}

		return null;
	}

	public static listar(): Promise<Predio[]> {
		return app.sql.connect(async (sql) => {
			return (await sql.query("select p.id, p.nome, p.nome_en, p.url, p.idusuario, u.nome usuario, date_format(p.criacao, '%d/%m/%Y') criacao from predio p inner join usuario u on u.id = p.idusuario where p.exclusao is null")) || [];
		});
	}

	public static listarCombo(): Promise<Predio[]> {
		return app.sql.connect(async (sql) => {
			return (await sql.query("select id, nome from predio where exclusao is null order by nome asc")) || [];
		});
	}

	private static async preencherLocais(sql: app.Sql, predio: Predio): Promise<void> {
		predio.locais = await sql.query("select l.id, l.nome, l.nome_en, l.rgb, l.versao, l.nome_curto, l.nome_curto_en, l.descricao, l.descricao_en from predio_local pl inner join local l on l.id = pl.idlocal where pl.idpredio = ? order by pl.ordem asc", [predio.id]);

		if (predio.locais) {
			for (let i = predio.locais.length - 1; i >= 0; i--) {
				predio.locais[i].url = `${app.root}/app/${predio.url}/imagem/${predio.locais[i].id}`;
			}
		}
	}

	public static obter(id: number, idusuario: number, idperfil: Perfil): Promise<Predio | null> {
		return app.sql.connect(async (sql) => {
			const lista: Predio[] = await sql.query(
				"select id, idusuario, nome, nome_en, url, date_format(criacao, '%d/%m/%Y') criacao from predio where id = ? and exclusao is null" + (idperfil === Perfil.Administrador ? "" : " and idusuario = ?"),
				(idperfil === Perfil.Administrador ? [id] : [id, idusuario])
			);

			if (!lista || !lista[0])
				return null;

			const predio = lista[0];

			await Predio.preencherLocais(sql, predio);

			return predio;
		});
	}

	public static obterPorUrl(url: string): Promise<Predio | null> {
		return app.sql.connect(async (sql) => {
			const lista: Predio[] = await sql.query("select id, nome, nome_en, url from predio where url = ? and exclusao is null", [url || ""]);

			if (!lista || !lista[0])
				return null;

			const predio = lista[0];

			await Predio.preencherLocais(sql, predio);

			return predio;
		});
	}

	public static async criar(predio: Predio, idusuario: number, idperfil: Perfil): Promise<string | null> {
		const res = Predio.validar(predio, true);
		if (res)
			return res;

		return app.sql.connect(async (sql) => {
			try {
				await sql.beginTransaction();

				await sql.query("insert into predio (idusuario, nome, nome_en, url, criacao) values (?, ?, ?, ?, ?)", [(idperfil === Perfil.Administrador) ? predio.idusuario : idusuario, predio.nome, predio.nome_en, predio.url, DataUtil.horarioDeBrasiliaISOComHorario()]);

				predio.id = await sql.scalar("select last_insert_id()") as number;

				if (predio.locais) {
					for (let i = 0; i < predio.locais.length; i++)
						await sql.query("insert into predio_local (idpredio, idlocal, ordem) values (?, ?, ?)", [predio.id, predio.locais[i], i]);
				}

				await sql.commit();

				return null;
			} catch (ex: any) {
				switch (ex.code) {
					case "ER_DUP_ENTRY":
						return `A URL ${predio.url} já está em uso`;
					case "ER_NO_REFERENCED_ROW":
					case "ER_NO_REFERENCED_ROW_2":
						return "Usuário ou local não encontrado";
				}

				throw ex;
			}
		});
	}

	public static async editar(predio: Predio, idusuario: number, idperfil: Perfil): Promise<string | null> {
		const res = Predio.validar(predio, false);
		if (res)
			return res;

		return app.sql.connect(async (sql) => {
			try {
				await sql.beginTransaction();

				await sql.query(
					"update predio set nome = ?, nome_en = ?, url = ? where id = ? and exclusao is null" + (idperfil === Perfil.Administrador ? "" : " and idusuario = ?"),
					(idperfil === Perfil.Administrador ? [predio.nome, predio.nome_en, predio.url, predio.id] : [predio.nome, predio.nome_en, predio.url, predio.id, idusuario])
				);

				if (!sql.affectedRows)
					return "Tour não encontrado";

				if (idperfil === Perfil.Administrador)
					await sql.query(`update predio set idusuario = ? where id = ?`, [predio.idusuario, predio.id]);

				const antigos: PredioLocal[] = (await sql.query("select id, idpredio, idlocal, ordem from predio_local where idpredio = ?", [predio.id])) || [];
				const atualizar: PredioLocal[] = [];
				const novos: PredioLocal[] = [];

				if (predio.locais) {
					for (let i = predio.locais.length - 1; i >= 0; i--)
						novos.push({
							id: 0,
							idpredio: predio.id,
							idlocal: predio.locais[i],
							ordem: i,
						});
				}

				for (let i = antigos.length - 1; i >= 0; i--) {
					const antigo = antigos[i];

					for (let j = novos.length - 1; j >= 0; j--) {
						const novo = novos[j];
						if (antigo.idlocal === novo.idlocal) {
							antigos.splice(i, 1);
							novos.splice(j, 1);
							if (antigo.ordem !== novo.ordem) {
								antigo.ordem = novo.ordem;
								atualizar.push(antigo);
							}
							break;
						}
					}
				}

				// Tenta reaproveitar os id's antigos se precisar adicionar algo novo
				for (let i = novos.length - 1; i >= 0; i--) {
					if (!antigos.length)
						break;

					const antigo = antigos.pop();
					antigo.idlocal = novos[i].idlocal;
					antigo.ordem = novos[i].ordem;

					atualizar.push(antigo);

					novos.splice(i, 1);
				}

				for (let i = antigos.length - 1; i >= 0; i--)
					await sql.query("delete from predio_local where id = ?", [antigos[i].id]);

				for (let i = atualizar.length - 1; i >= 0; i--)
					await sql.query("update predio_local set idlocal = ?, ordem = ? where id = ?", [atualizar[i].idlocal, atualizar[i].ordem, atualizar[i].id]);

				for (let i = novos.length - 1; i >= 0; i--)
					await sql.query("insert into predio_local (idpredio, idlocal, ordem) values (?, ?, ?)", [novos[i].idpredio, novos[i].idlocal, novos[i].ordem]);

				await sql.commit();

				return null;
			} catch (ex: any) {
				switch (ex.code) {
					case "ER_DUP_ENTRY":
						return `A URL ${predio.url} já está em uso`;
				}

				throw ex;
			}
		});
	}

	public static async excluir(id: number, idusuario: number, idperfil: Perfil): Promise<string | null> {
		return app.sql.connect(async (sql) => {
			await sql.beginTransaction();

			// Utilizar substr(url, instr(url, ':') + 1) para remover o prefixo, caso precise desfazer a exclusão (caso
			// não exista o prefixo, instr() vai retornar 0, que, com o + 1, faz o substr() retornar a própria string inteira)
			await sql.query(
				"update predio set url = concat('@', id, ':', url), exclusao = ? where id = ? and exclusao is null" + (idperfil === Perfil.Administrador ? "" : " and idusuario = ?"),
				(idperfil === Perfil.Administrador ? [DataUtil.horarioDeBrasiliaISOComHorario(), id] : [DataUtil.horarioDeBrasiliaISOComHorario(), id, idusuario])
			);

			if (!sql.affectedRows)
				return "Tour não encontrado";

			await sql.query("delete from predio_local where idpredio = ?", [id]);

			await sql.commit();

			return null;
		});
	}
}

export = Predio;
