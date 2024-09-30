import app = require("teem");
import appsettings = require("../appsettings");
import DataUtil = require("../utils/dataUtil");

interface Predio {
	id: number;
	idusuario: number;
	nome: string;
	url: string;
	criacao: string;
	exclusao: string | null;
}

class Predio {
	private static validar(predio: Predio, criacao: boolean): string | null {
		if (!predio)
			return "Prédio inválido";

		predio.id = parseInt(predio.id as any);

		if (!criacao) {
			if (isNaN(predio.id))
				return "Id inválido";
		}

		if (!predio.nome || !(predio.nome = predio.nome.normalize().trim()) || predio.nome.length > 50)
			return "Nome inválido";

		// Limita a URL a 60 caracteres para deixar 15 sobrando, para tentar evitar perda de dados durante a concatenação da exclusão
		if (!predio.url || !(predio.url = predio.url.normalize().trim().toLowerCase()) || predio.url.length > 60)
			return "URL inválida";

		return null;
	}

	public static listar(): Promise<Predio[]> {
		return app.sql.connect(async (sql) => {
			return (await sql.query("select p.id, p.nome, p.url, p.idusuario, u.nome usuario, date_format(p.criacao, '%d/%m/%Y') criacao from predio p inner join usuario u on u.id = p.idusuario where p.exclusao is null")) || [];
		});
	}

	public static listarCombo(): Promise<Predio[]> {
		return app.sql.connect(async (sql) => {
			return (await sql.query("select id, nome from predio where exclusao is null order by nome asc")) || [];
		});
	}

	public static obter(id: number): Promise<Predio | null> {
		return app.sql.connect(async (sql) => {
			const lista: Predio[] = await sql.query("select id, idusuario, nome, url, date_format(criacao, '%d/%m/%Y') criacao from predio where id = ? and exclusao is null", [id]);

			return ((lista && lista[0]) || null);
		});
	}

	public static async criar(predio: Predio, idusuario: number): Promise<string | null> {
		const res = Predio.validar(predio, true);
		if (res)
			return res;

		return app.sql.connect(async (sql) => {
			try {
				await sql.query("insert into predio (idusuario, nome, url, criacao) values (?, ?, ?, ?)", [idusuario, predio.nome, predio.url, DataUtil.horarioDeBrasiliaISOComHorario()]);

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

	public static async editar(predio: Predio): Promise<string | null> {
		const res = Predio.validar(predio, false);
		if (res)
			return res;

		return app.sql.connect(async (sql) => {
			try {
				await sql.query("update predio set nome = ?, url = ? where id = ? and exclusao is null", [predio.nome, predio.url, predio.id]);

				if (!sql.affectedRows)
					return "Prédio não encontrado";

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

	public static async excluir(id: number): Promise<string | null> {
		return app.sql.connect(async (sql) => {
			// Utilizar substr(url, instr(url, ':') + 1) para remover o prefixo, caso precise desfazer a exclusão (caso
			// não exista o prefixo, instr() vai retornar 0, que, com o + 1, faz o substr() retornar a própria string inteira)
			await sql.query("update predio set url = concat('@', id, ':', url), exclusao = ? where id = ? and exclusao is null", [DataUtil.horarioDeBrasiliaISOComHorario(), id]);

			return (sql.affectedRows ? null : "Prédio não encontrado");
		});
	}
}

export = Predio;
