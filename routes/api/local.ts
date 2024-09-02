import app = require("teem");
import Perfil = require("../../enums/perfil");
import Usuario = require("../../models/usuario");

class LocalApi {
    @app.http.post()
    @app.route.formData()
    public static async criarLocal(req: app.Request, res: app.Response) {
        let local = req.body;
        let imagem = req.uploadedFiles["imagem"];

        const u = await Usuario.cookie(req, res);
        if (!u) return;

        await app.sql.connect(async (sql: app.Sql) => {
            try {
                await sql.beginTransaction();

                await sql.query(
                    "INSERT INTO local (nomeLocal, nomeCurto, versao, rgb) VALUES (?, ?, ?, ?)", 
                    [local.nome, local.nomeCurto, local.versao, local.rgb]
                );

                let idVisita = await sql.scalar("SELECT last_insert_id()");

                if (imagem) { 
                    app.fileSystem.saveUploadedFile("/public/img/locais/" + idVisita + ".jpg", imagem);
                }

                await sql.commit();
                res.json(true);
            } catch (error) {
                await sql.rollback();
                console.error(error); 
                res.status(500).json({ error: "Erro interno no servidor." });
            }
        });
    }


    public async listarPredio(req: app.Request, res: app.Response) {
		let predio: any[];

		await app.sql.connect(async (sql: app.Sql) => {
            predio = await sql.query("SELECT id, nome FROM predio;");
        });

		res.render("exemplo/local", {
			predio: predio
		});
	};

}

export = LocalApi;
