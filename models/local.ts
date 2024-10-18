import app = require("teem");
import appsettings = require("../appsettings");
import DataUtil = require("../utils/dataUtil");
import Perfil = require("../enums/perfil");

interface Local {
	id: number;
	idpredio: number;
	idusuario: number;
	nome: string;
	rgb: string;
	nome_curto: string;
	versao: number;
	criacao: string;
	exclusao: string | null;
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

		if (!(local.idpredio = parseInt(local.idpredio as any)))
			return "Tour inválido";

		if (!local.nome || !(local.nome = local.nome.normalize().trim()) || local.nome.length > 50)
			return "Nome inválido";

		if (!local.rgb || !(local.rgb = local.rgb.normalize().trim()) || local.rgb.length > 10)
			return "Cor inválida";

		if (!local.nome_curto || !(local.nome_curto = local.nome_curto.normalize().trim()) || local.nome.length > 50)
			return "Nome inválido";

		return null;
	}

	public static listar(idusuario: number, idperfil: Perfil): Promise<Local[]> {
		return app.sql.connect(async (sql) => {
			return (await sql.query(
				"select l.id, l.nome, l.rgb, l.versao, l.nome_curto, l.idpredio, p.nome predio, p.url, l.idusuario, u.nome usuario, date_format(p.criacao, '%d/%m/%Y') criacao from local l inner join predio p on p.id = l.idpredio and p.exclusao is null " + (idperfil === Perfil.Administrador ? "" : " and p.idusuario = ?") + " inner join usuario u on u.id = l.idusuario where l.exclusao is null",
				(idperfil === Perfil.Administrador ? [] : [idusuario])
			)) || [];
		});
	}

	public static obter(id: number, idusuario: number, idperfil: Perfil): Promise<Local | null> {
		return app.sql.connect(async (sql) => {
			const lista: Local[] = await sql.query(
				"select l.id, l.nome, l.rgb, l.versao, l.nome_curto, l.idpredio, p.nome predio, p.url url, l.idusuario, u.nome usuario, date_format(p.criacao, '%d/%m/%Y') criacao from local l inner join predio p on p.id = l.idpredio and p.exclusao is null " + (idperfil === Perfil.Administrador ? "" : " and p.idusuario = ?") + " inner join usuario u on u.id = l.idusuario where l.id = ? and l.exclusao is null",
				(idperfil === Perfil.Administrador ? [id] : [idusuario, id])
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

				if (!(await sql.scalar(
					"select id from predio where id = ? and exclusao is null" + (idperfil === Perfil.Administrador ? "" : " and idusuario = ?"),
					(idperfil === Perfil.Administrador ? [local.idpredio] : [local.idpredio, idusuario])
				)))
					return "Tour não encontrado";

				await sql.query("insert into local (idpredio, idusuario, nome, rgb, nome_curto, versao, criacao) values (?, ?, ?, ?, ?, ?, ?)", [local.idpredio, idusuario, local.nome, local.rgb, local.nome_curto, 1, DataUtil.horarioDeBrasiliaISOComHorario()]);

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

				if (!(await sql.scalar(
					"select id from predio where id = ? and exclusao is null" + (idperfil === Perfil.Administrador ? "" : " and idusuario = ?"),
					(idperfil === Perfil.Administrador ? [local.idpredio] : [local.idpredio, idusuario])
				)))
					return "Tour não encontrado";

				let alterarVersao = !!imagem;

				if (!alterarVersao) {
					const dadosAntigos: Local[] = await sql.query("select idpredio, nome, rgb, nome_curto from local where id = ? and exclusao is null", [local.id]);

					if (!dadosAntigos || !dadosAntigos[0])
						return "Local não encontrado";

					// Não precisa validar para administradores, nem precisa considerar a questão
					// de prédios excluídos (só faz essa consulta para evitar edições de locais
					// que não pertençam a um tour do usuário)
					if (idperfil !== Perfil.Administrador && dadosAntigos[0].idpredio !== local.idpredio) {
						if (!(await sql.scalar(
							"select id from predio where id = ? and idusuario = ?",
							[dadosAntigos[0].idpredio, idusuario]
						)))
							return "Local não encontrado";
					}

					alterarVersao = (
						dadosAntigos[0].idpredio !== local.idpredio ||
						dadosAntigos[0].nome !== local.nome ||
						dadosAntigos[0].rgb !== local.rgb ||
						dadosAntigos[0].nome_curto !== local.nome_curto
					);
				}

				await sql.query(`update local set idpredio = ?, nome = ?, rgb = ?, nome_curto = ?${(alterarVersao ? ", versao = versao + 1" : "")} where id = ? and exclusao is null`, [local.idpredio, local.nome, local.rgb, local.nome_curto, local.id]);

				if (!sql.affectedRows)
					return "Local não encontrado";

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

			if (idperfil !== Perfil.Administrador) {
				const idpredio: number = await sql.scalar("select idpredio from local where id = ? and exclusao is null", [id]);
				if (!idpredio)
					return "Local não encontrado";

				if (!(await sql.scalar(
					"select id from predio where id = ? and idusuario = ?",
					[idpredio, idusuario]
				)))
					return "Local não encontrado";
			}

			await sql.query("update local set exclusao = ? where id = ? and exclusao is null", [DataUtil.horarioDeBrasiliaISOComHorario(), id]);

			if (!sql.affectedRows) 
				return "Local não encontrado";

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
