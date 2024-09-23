import app = require("teem");
import Perfil = require("../../enums/perfil");
import Usuario = require("../../models/usuario");

class PredioApi {
  @app.http.post()
  @app.route.formData()
  public static async criarLocal(req: app.Request, res: app.Response) {
    let predio = req.body;

    // Verifique se os dados foram recebidos corretamente
    if (!predio || !predio.nome || !predio.url) {
      res.status(400).json({ erro: "Dados inválidos." });
      return;
    }

    const u = await Usuario.cookie(req, res);
    if (!u) return;

    await app.sql.connect(async (sql: app.Sql) => {
      try {
        await sql.beginTransaction();

        // Realiza a inserção
        await sql.query(
          "INSERT INTO predio (nome, url) VALUES (?, ?)",
          [predio.nome, predio.url]
        );

        await sql.commit();
        res.json(true);
      } catch (err) {
        await sql.rollback();
        console.error("Erro ao criar prédio: ", err);
        res.status(500).json({ erro: "Erro no servidor." });
      }
    });
  }
}

export = PredioApi;
