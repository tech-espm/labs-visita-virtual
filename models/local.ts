import app = require("teem");
import appsettings = require("../appsettings");
import DataUtil = require("../utils/dataUtil");
import Perfil = require("../enums/perfil");

interface Local {
	id: number;
	idusuario: number;
	nome: string;
	nome_en: string;
	rgb: string;
	nome_curto: string;
	nome_curto_en: string;
	versao: number;
	criacao: string;
	exclusao: string | null;
	descricao: string;
	descricao_en: string;
}

class Local {
	private static validar(local: Local, criacao: boolean): string | null {
		if (!local)
			return "Local inválido";

		local.id = parseInt(local.id as any);

		if (!criacao) {
			if (isNaN(local.id))
				return "Id inválido";
		}

		local.idusuario = parseInt(local.idusuario as any) || 0;

		if (!local.nome || !(local.nome = local.nome.normalize().trim()) || local.nome.length > 50)
			return "Nome inválido";

		if (!local.nome_en || !(local.nome_en = local.nome_en.normalize().trim()) || local.nome_en.length > 50)
			return "Nome em Inglês inválido";

		if (!local.descricao || !(local.descricao = local.descricao.normalize().trim()) || local.descricao.length > 500)
			return "Descrição inválida";

		if (!local.rgb || !(local.rgb = local.rgb.normalize().trim()) || local.rgb.length > 10)
			return "Cor inválida";

		if (!local.nome_curto || !(local.nome_curto = local.nome_curto.normalize().trim()) || local.nome_curto.length > 50)
			return "Nome curto inválido";

		if (!local.nome_curto_en || !(local.nome_curto_en = local.nome_curto_en.normalize().trim()) || local.nome_curto_en.length > 50)
			return "Nome curto em Inglês inválido";

		if (!local.descricao_en || !(local.descricao_en = local.descricao_en.normalize().trim()) || local.descricao_en.length > 500)
			return "Descrição em Inglês inválida";

		return null;
	}

	public static listar(): Promise<Local[]> {
		return app.sql.connect(async (sql) => {
			return (await sql.query("select l.id, l.nome, l.nome_en, l.rgb, l.versao, l.nome_curto, l.nome_curto_en, l.idusuario, u.nome usuario, date_format(l.criacao, '%d/%m/%Y') criacao from local l inner join usuario u on u.id = l.idusuario where l.exclusao is null")) || [];
		});
	}

	public static listarCombo(): Promise<Local[]> {
		return app.sql.connect(async (sql) => {
			return (await sql.query("select id, nome, rgb from local where exclusao is null order by nome asc")) || [];
		});
	}

	public static obter(id: number, idusuario: number, idperfil: Perfil): Promise<Local | null> {
		return app.sql.connect(async (sql) => {
			const lista: Local[] = await sql.query(
				"select l.id, l.nome, l.nome_en, l.rgb, l.versao, l.nome_curto, l.nome_curto_en, l.descricao, l.descricao_en, l.idusuario, u.nome usuario, date_format(l.criacao, '%d/%m/%Y') criacao from local l inner join usuario u on u.id = l.idusuario where l.id = ? and l.exclusao is null" + ((idperfil === Perfil.Administrador) ? "" : " and l.idusuario = ?"),
				(idperfil === Perfil.Administrador ? [id] : [id, idusuario])
			);

			return ((lista && lista[0]) || null);
		});
	}

	public static async criar(local: Local, idusuario: number, idperfil: Perfil, imagem: app.UploadedFile): Promise<string | null> {
		const res = Local.validar(local, true);
		if (res)
			return res;

		if (!imagem || imagem.mimetype !== "image/jpeg" || !imagem.buffer)
			return "Imagem inválida";

		if (imagem.size > 10 * 1024 * 1024)
			return "O tamanho da imagem excede 10 MB";

		return app.sql.connect(async (sql) => {
			try {
				await sql.beginTransaction();

				await sql.query("insert into local (idusuario, nome, nome_en, rgb, nome_curto, nome_curto_en, descricao, descricao_en, versao, criacao) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [(idperfil === Perfil.Administrador) ? local.idusuario : idusuario, local.nome, local.nome_en, local.rgb, local.nome_curto, local.nome_curto_en, local.descricao, local.descricao_en, 1, DataUtil.horarioDeBrasiliaISOComHorario()]);

				local.id = await sql.scalar("select last_insert_id()");

				await app.fileSystem.saveUploadedFile(`public/img/${appsettings.pastaLocais}/${local.id}.jpg`, imagem);

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

	public static async editar(local: Local, idusuario: number, idperfil: Perfil, imagem?: app.UploadedFile | null): Promise<string | null> {
		const res = Local.validar(local, false);
		if (res)
			return res;

		if (imagem) {
			if (imagem.mimetype !== "image/jpeg" && !imagem.buffer)
				return "Imagem inválida";

			if (imagem.size > 10 * 1024 * 1024)
				return "O tamanho da imagem excede 10 MB";
		}

		return app.sql.connect(async (sql) => {
			try {
				await sql.beginTransaction();

				const dadosAntigos: Local[] = await sql.query("select nome, nome_en, rgb, nome_curto, nome_curto_en, descricao, descricao_en from local where id = ? and exclusao is null" + ((idperfil === Perfil.Administrador) ? "" : " and idusuario = ?"), (idperfil === Perfil.Administrador) ? [local.id] : [local.id, idusuario]);

				if (!dadosAntigos || !dadosAntigos[0])
					return "Local não encontrado";

				const alterarVersao = (
					!!imagem ||
					dadosAntigos[0].nome !== local.nome ||
					dadosAntigos[0].nome_en !== local.nome_en ||
					dadosAntigos[0].rgb !== local.rgb ||
					dadosAntigos[0].nome_curto !== local.nome_curto ||
					dadosAntigos[0].nome_curto_en !== local.nome_curto_en ||
					dadosAntigos[0].descricao !== local.descricao ||
					dadosAntigos[0].descricao_en !== local.descricao_en
				);

				await sql.query(`update local set nome = ?, nome_en = ?, rgb = ?, nome_curto = ?, nome_curto_en = ?, descricao = ?, descricao_en = ?${(alterarVersao ? ", versao = versao + 1" : "")} where id = ? and exclusao is null`, [local.nome, local.nome_en, local.rgb, local.nome_curto, local.nome_curto_en, local.descricao, local.descricao_en, local.id]);

				if (!sql.affectedRows)
					return "Local não encontrado";

				if (idperfil === Perfil.Administrador)
					await sql.query(`update local set idusuario = ? where id = ?`, [local.idusuario, local.id]);

				if (imagem)
					await app.fileSystem.saveUploadedFile(`public/img/${appsettings.pastaLocais}/${local.id}.jpg`, imagem);

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

			await sql.query("update local set exclusao = ? where id = ? and exclusao is null" + ((idperfil === Perfil.Administrador) ? "" : " and idusuario = ?"), (idperfil === Perfil.Administrador) ? [DataUtil.horarioDeBrasiliaISOComHorario(), id] : [DataUtil.horarioDeBrasiliaISOComHorario(), id, idusuario]);

			if (!sql.affectedRows) 
				return "Local não encontrado";

			await sql.query("delete from predio_local where idlocal = ?", [id]);

			await app.fileSystem.deleteFile(`public/img/${appsettings.pastaLocais}/${id}.jpg`);

			await sql.commit();

			return null;
		});
	}

	public static async obterImagem(res: app.Response, id: number): Promise<void> {
		const caminho = `public/img/${appsettings.pastaLocais}/${id}.jpg`;
		if (!id || !(await app.fileSystem.exists(caminho))) {
			res.status(404).send("Não encontrado");
			return;
		}

		res.sendFile(app.fileSystem.absolutePath(caminho));
	}
}

export = Local;
