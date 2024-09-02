import app = require("teem");
import Perfil = require("../../enums/perfil");
import Usuario = require("../../models/usuario");

class PredioApi {
  @app.http.post()
  @app.route.formData()
  public static async criarLocal(req: app.Request, res: app.Response) {
    let predio = req.body;

    const u = await Usuario.cookie(req, res);
    if (!u) return;

    await app.sql.connect(async (sql: app.Sql) => {
      await sql.beginTransaction();

      await sql.query(
        "INSERT INTO predio (nome, url) VALUES (?, ?)",
        [predio.nome, predio.url]
      );

      await sql.commit();
      res.json(true);
    });
  }
}

export = PredioApi;
