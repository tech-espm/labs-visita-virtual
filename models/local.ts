import app = require("teem");
import appsettings = require("../appsettings");
import DataUtil = require("../utils/dataUtil");

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
			return "Prédio inválido";

		if (!local.nome || !(local.nome = local.nome.normalize().trim()) || local.nome.length > 50)
			return "Nome inválido";

		if (!local.rgb || !(local.rgb = local.rgb.normalize().trim()) || local.rgb.length > 10)
			return "Cor inválida";

		if (!local.nome_curto || !(local.nome_curto = local.nome_curto.normalize().trim()) || local.nome.length > 50)
			return "Nome inválido";

		return null;
	}

	public static listar(): Promise<Local[]> {
		return app.sql.connect(async (sql) => {
			return (await sql.query("select l.id, l.nome, l.rgb, l.versao, l.nome_curto, l.idpredio, p.nome predio, l.idusuario, u.nome usuario, date_format(p.criacao, '%d/%m/%Y') criacao from local l inner join predio p on p.id = l.idpredio and p.exclusao is null inner join usuario u on u.id = l.idusuario where l.exclusao is null")) || [];
		});
	}

	public static obter(id: number): Promise<Local | null> {
		return app.sql.connect(async (sql) => {
			const lista: Local[] = await sql.query("select l.id, l.nome, l.rgb, l.versao, l.nome_curto, l.idpredio, p.nome predio, l.idusuario, u.nome usuario, date_format(p.criacao, '%d/%m/%Y') criacao from local l inner join predio p on p.id = l.idpredio and p.exclusao is null inner join usuario u on u.id = l.idusuario where l.id = ? and l.exclusao is null", [id]);

			return ((lista && lista[0]) || null);
		});
	}

	public static async criar(local: Local, idusuario: number, imagem: app.UploadedFile): Promise<string | null> {
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

				await sql.query("insert into local (idpredio, idusuario, nome, rgb, nome_curto, versao, criacao) values (?, ?, ?, ?, ?, ?, ?)", [local.idpredio, idusuario, local.nome, local.rgb, local.nome_curto, 1, DataUtil.horarioDeBrasiliaISOComHorario()]);

				local.id = await sql.scalar("select last_insert_id()");

				await app.fileSystem.saveUploadedFile(`public/img/${appsettings.pastaLocais}/${local.id}.jpg`, imagem);

				await sql.commit();

				return null;
			} catch (ex: any) {
				switch (ex.code) {
					case "ER_NO_REFERENCED_ROW":
					case "ER_NO_REFERENCED_ROW_2":
						return "Usuário ou prédio não encontrado";
				}

				throw ex;
			}
		});
	}

	public static async editar(local: Local, imagem?: app.UploadedFile | null): Promise<string | null> {
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

				await sql.query(`update local set idpredio = ?, nome = ?, rgb = ?, nome_curto = ?${(imagem ? ", versao = versao + 1" : "")} where id = ? and exclusao is null`, [local.idpredio, local.nome, local.rgb, local.nome_curto, local.id]);

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
						return "Usuário ou prédio não encontrado";
				}

				throw ex;
			}
		});
	}

	public static async excluir(id: number): Promise<string | null> {
		return app.sql.connect(async (sql) => {
			await sql.beginTransaction();

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
