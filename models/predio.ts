import app = require("teem");
import appsettings = require("../appsettings");
import DataUtil = require("../utils/dataUtil");
import Perfil = require("../enums/perfil");

interface Predio {
	id: number;
	idusuario: number;
	nome: string;
	url: string;
	criacao: string;
	exclusao: string | null;

	// Utilizado apenas para a visita
	locais?: any[] | null;
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

		// Limita a URL a 60 caracteres para deixar 15 sobrando, para tentar evitar perda de dados durante a concatenação da exclusão
		if (!predio.url || !(predio.url = predio.url.normalize().trim().toLowerCase()) || predio.url.length > 60)
			return "URL inválida";

		return null;
	}

	public static listar(idusuario: number, idperfil: Perfil): Promise<Predio[]> {
		return app.sql.connect(async (sql) => {
			return (await sql.query(
				"select p.id, p.nome, p.url, p.idusuario, u.nome usuario, date_format(p.criacao, '%d/%m/%Y') criacao from predio p inner join usuario u on u.id = p.idusuario where p.exclusao is null" + (idperfil === Perfil.Administrador ? "" : " and p.idusuario = ?"),
				(idperfil === Perfil.Administrador ? [] : [idusuario])
			)) || [];
		});
	}

	public static listarCombo(idusuario: number, idperfil: Perfil): Promise<Predio[]> {
		return app.sql.connect(async (sql) => {
			return (await sql.query(
				"select id, nome from predio where exclusao is null" + (idperfil === Perfil.Administrador ? "" : " and idusuario = ?") + " order by nome asc",
				(idperfil === Perfil.Administrador ? [] : [idusuario])
			)) || [];
		});
	}

	private static async preencherLocais(sql: app.Sql, predio: Predio): Promise<void> {
		predio.locais = await sql.query("select id, nome, rgb, versao, nome_curto from local where exclusao is null and idpredio = ? order by ordem asc", [predio.id]);

		if (predio.locais) {
			for (let i = predio.locais.length - 1; i >= 0; i--) {
				predio.locais[i].url = `${app.root}/app/${predio.url}/imagem/${predio.locais[i].id}`;
			}
		}
	}

	public static obter(id: number, idusuario: number, idperfil: Perfil): Promise<Predio | null> {
		return app.sql.connect(async (sql) => {
			const lista: Predio[] = await sql.query(
				"select id, idusuario, nome, url, date_format(criacao, '%d/%m/%Y') criacao from predio where id = ? and exclusao is null" + (idperfil === Perfil.Administrador ? "" : " and idusuario = ?"),
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
			const lista: Predio[] = await sql.query("select id, nome, url from predio where url = ? and exclusao is null", [url || ""]);

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
				await sql.query("insert into predio (idusuario, nome, url, criacao) values (?, ?, ?, ?)", [(idperfil === Perfil.Administrador) ? predio.idusuario : idusuario, predio.nome, predio.url, DataUtil.horarioDeBrasiliaISOComHorario()]);

				return null;
			} catch (ex: any) {
				switch (ex.code) {
					case "ER_DUP_ENTRY":
						return `A URL ${predio.url} já está em uso`;
					case "ER_NO_REFERENCED_ROW":
					case "ER_NO_REFERENCED_ROW_2":
						return "Usuário não encontrado";
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
					"update predio set nome = ?, url = ? where id = ? and exclusao is null" + (idperfil === Perfil.Administrador ? "" : " and idusuario = ?"),
					(idperfil === Perfil.Administrador ? [predio.nome, predio.url, predio.id] : [predio.nome, predio.url, predio.id, idusuario])
				);

				if (!sql.affectedRows)
					return "Tour não encontrado";

				if (idperfil === Perfil.Administrador)
					await sql.query(`update predio set idusuario = ? where id = ?`, [predio.idusuario, predio.id]);

				if (predio.locais) {
					if (!Array.isArray(predio.locais))
						predio.locais = [predio.locais];

					for (let i = 0; i < predio.locais.length; i++) {
						const idlocal = parseInt(predio.locais[i]);
						if (!idlocal)
							continue;

						await sql.query("update local set ordem = ? where id = ?", [i, idlocal]);
					}
				}

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
			// Utilizar substr(url, instr(url, ':') + 1) para remover o prefixo, caso precise desfazer a exclusão (caso
			// não exista o prefixo, instr() vai retornar 0, que, com o + 1, faz o substr() retornar a própria string inteira)
			await sql.query(
				"update predio set url = concat('@', id, ':', url), exclusao = ? where id = ? and exclusao is null" + (idperfil === Perfil.Administrador ? "" : " and idusuario = ?"),
				(idperfil === Perfil.Administrador ? [DataUtil.horarioDeBrasiliaISOComHorario(), id] : [DataUtil.horarioDeBrasiliaISOComHorario(), id, idusuario])
			);

			return (sql.affectedRows ? null : "Tour não encontrado");
		});
	}
}

export = Predio;
