import app = require("teem");
import appsettings = require("../appsettings");
import DataUtil = require("../utils/dataUtil");
import Perfil = require("../enums/perfil");

interface Link {
	id: number;
	idusuario: number;
	nome: string;
    nome_en: string;
    url: string;
    rgb: string;
	versao: number;
	criacao: string;
	exclusao: string | null;
}

class Link {
	private static validar(link: Link, criacao: boolean): string | null {
		if (!link)
			return "Link inválido";

		link.id = parseInt(link.id as any);

		if (!criacao) {
			if (isNaN(link.id))
				return "Id inválido";
		}

		link.idusuario = parseInt(link.idusuario as any) || 0;

		if (!link.nome || !(link.nome = link.nome.normalize().trim()) || link.nome.length > 20)
			return "Nome inválido";

		if (!link.nome_en || !(link.nome_en = link.nome_en.normalize().trim()) || link.nome_en.length > 50)
			return "Nome em Inglês inválido";

        if (!link.url || !(link.url = link.url.normalize().trim()) || link.url.length > 200)
            return "URL inválido";

		if (!link.rgb || !(link.rgb = link.rgb.normalize().trim()) || link.rgb.length > 10)
			return "Cor inválida";

		return null;
	}

	public static listar(): Promise<Link[]> {
		return app.sql.connect(async (sql) => {
			return (await sql.query("select l.id, l.nome, l.nome_en, l.rgb, l.versao, l.url, l.idusuario, u.nome usuario, date_format(l.criacao, '%d/%m/%Y') criacao from link l inner join usuario u on u.id = l.idusuario where l.exclusao is null")) || [];
		});
	}

	public static listarCombo(): Promise<Link[]> {
		return app.sql.connect(async (sql) => {
			return (await sql.query("select id, nome, rgb, url from link where exclusao is null order by nome asc")) || [];
		});
	}

	public static obter(id: number, idusuario: number, idperfil: Perfil): Promise<Link | null> {
		return app.sql.connect(async (sql) => {
			const lista: Link[] = await sql.query(
				"select l.id, l.nome, l.nome_en, l.rgb, l.versao, l.url, l.idusuario, u.nome usuario, date_format(l.criacao, '%d/%m/%Y') criacao from link l inner join usuario u on u.id = l.idusuario where l.id = ? and l.exclusao is null" + ((idperfil === Perfil.Administrador) ? "" : " and l.idusuario = ?"),
				(idperfil === Perfil.Administrador ? [id] : [id, idusuario])
			);

			return ((lista && lista[0]) || null);
		});
	}

	public static async criar(link: Link, idusuario: number, idperfil: Perfil): Promise<string | null> {
		const res = Link.validar(link, true);
		if (res)
			return res;

		return app.sql.connect(async (sql) => {
			try {
				await sql.beginTransaction();

				await sql.query("insert into link (idusuario, nome, nome_en, rgb, url, versao, criacao) values (?, ?, ?, ?, ?, ?, ?)", [(idperfil === Perfil.Administrador) ? link.idusuario : idusuario, link.nome, link.nome_en, link.rgb, link.url, 1, DataUtil.horarioDeBrasiliaISOComHorario()]);

				link.id = await sql.scalar("select last_insert_id()");

				await sql.commit();

				return null;
			} catch (ex: any) {
				switch (ex.code) {
					case "ER_NO_REFERENCED_ROW":
					case "ER_NO_REFERENCED_ROW_2":
						return "Usuário ou tour não encontrado";
				}

				throw ex;
			}
		});
	}

	public static async editar(link: Link, idusuario: number, idperfil: Perfil, imagem?: app.UploadedFile | null): Promise<string | null> {
		const res = Link.validar(link, false);
		if (res)
			return res;

		return app.sql.connect(async (sql) => {
			try {
				await sql.beginTransaction();

				const dadosAntigos: Link[] = await sql.query("select nome, nome_en, rgb, url from link where id = ? and exclusao is null" + ((idperfil === Perfil.Administrador) ? "" : " and idusuario = ?"), (idperfil === Perfil.Administrador) ? [link.id] : [link.id, idusuario]);

				if (!dadosAntigos || !dadosAntigos[0])
					return "Link não encontrado";

				const alterarVersao = (
					!!imagem ||
					dadosAntigos[0].nome !== link.nome ||
					dadosAntigos[0].nome_en !== link.nome_en ||
					dadosAntigos[0].rgb !== link.rgb ||
					dadosAntigos[0].url !== link.url
				);

				await sql.query(`update url set nome = ?, nome_en = ?, rgb = ?, url = ? ${(alterarVersao ? ", versao = versao + 1" : "")} where id = ? and exclusao is null`, [link.nome, link.nome_en, link.rgb, link.url, link.id]);

				if (!sql.affectedRows)
					return "Link não encontrado";

				if (idperfil === Perfil.Administrador)
					await sql.query(`update link set idusuario = ? where id = ?`, [link.idusuario, link.id]);

				await sql.commit();

				return null;
			} catch (ex: any) {
				switch (ex.code) {
					case "ER_NO_REFERENCED_ROW":
					case "ER_NO_REFERENCED_ROW_2":
						return "Usuário ou tour não encontrado";
				}

				throw ex;
			}
		});
	}

	public static async excluir(id: number, idusuario: number, idperfil: Perfil): Promise<string | null> {
		return app.sql.connect(async (sql) => {
			await sql.beginTransaction();

			await sql.query("update link set exclusao = ? where id = ? and exclusao is null" + ((idperfil === Perfil.Administrador) ? "" : " and idusuario = ?"), (idperfil === Perfil.Administrador) ? [DataUtil.horarioDeBrasiliaISOComHorario(), id] : [DataUtil.horarioDeBrasiliaISOComHorario(), id, idusuario]);

			if (!sql.affectedRows) 
				return "Link não encontrado";

			await sql.query("delete from link where idlink = ?", [id]);

			await sql.commit();

			return null;
		});
	}
}

export = Link;
