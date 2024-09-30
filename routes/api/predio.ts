import app = require("teem");
import Usuario = require("../../models/usuario");

class PredioRoute {
  // Renderiza a página de criação
  public static async criar(req: app.Request, res: app.Response) {
    let u = await Usuario.cookie(req);
    if (!u || !u.admin)
      res.redirect(app.root + "/acesso");
    else
      res.render("predio/editar", {
        titulo: "Criar Prédio",
        textoSubmit: "Criar",
        datatables: true,
        predio: u,
        lista: await PredioRoute.listarTodos(),
        usuario: u,
        item: null,
      });
  }

  // Renderiza a página de edição
  public static async editar(req: app.Request, res: app.Response) {
    let u = await Usuario.cookie(req);
    if (!u || !u.admin) {
      res.redirect(app.root + "/acesso");
    } else {
      let id = parseInt(req.query["id"] as string);
      let item: any = null;
      if (isNaN(id) || !(item = await PredioRoute.obter(id))) {
        res.render("index/nao-encontrado", {
          layout: "layout-sem-form",
          usuario: u,
        });
      } else
        res.render("predio/editar", {
          titulo: "Editar Prédio",
          usuario: u,
          item: item,
        });
    }
  }

  // Renderiza a lista de prédios
  public static async listar(req: app.Request, res: app.Response) {
    let u = await Usuario.cookie(req);
    if (!u || !u.admin) res.redirect(app.root + "/acesso");
    else
      res.render("predio/listar", {
        layout: "layout-tabela",
        titulo: "Gerenciar Prédios",
        datatables: true,
        usuario: u,
        lista: await PredioRoute.listarTodos(),
      });
  }

  // POST para criar prédio
  public static async criarPost(req: app.Request, res: app.Response) {
    let predio = req.body;

    if (!predio || !predio.nome || !predio.url) {
      res.status(400).json({ erro: "Dados inválidos." });
      return;
    }

    let u = await Usuario.cookie(req);
    if (!u || !u.admin) return;

    await app.sql.connect(async (sql: app.Sql) => {
      try {
        await sql.beginTransaction();
        await sql.query(
          "INSERT INTO predio (idusuario, nome, url, criacao) VALUES (?, ?, ?, NOW())",
          [u.id, predio.nome, predio.url]
        );
        await sql.commit();
        console.log("Prédio criado com sucesso.");
        res.json({ success: true });
      } catch (err) {
        await sql.rollback();
        console.error("Erro ao criar prédio: ", err);
        res.status(500).json({ erro: "Erro no servidor." });
      }
    });
  }

  // POST para editar prédio
  public static async editarPost(req: app.Request, res: app.Response) {
    let predio = req.body;
    let id = parseInt(req.body.id);

    if (!predio || !predio.nome || !predio.url || isNaN(id)) {
      res.status(400).json({ erro: "Dados inválidos." });
      return;
    }

    let u = await Usuario.cookie(req);
    if (!u || !u.admin) return;

    await app.sql.connect(async (sql: app.Sql) => {
      try {
        await sql.beginTransaction();
        await sql.query(
          "UPDATE predio SET nome = ?, url = ?, exclusao = ? WHERE id = ?",
          [predio.nome, predio.url, predio.exclusao || null, id]
        );
        await sql.commit();
        console.log("Prédio editado com sucesso.");
        res.json({ success: true });
      } catch (err) {
        await sql.rollback();
        console.error("Erro ao editar prédio: ", err);
        res.status(500).json({ erro: "Erro no servidor." });
      }
    });
  }

  // Método para excluir um prédio
  public static async excluir(req: app.Request, res: app.Response) {
    let id = parseInt(req.query["id"] as string);

    if (isNaN(id)) {
      res.status(400).json({ erro: "ID inválido." });
      return;
    }

    let u = await Usuario.cookie(req);
    if (!u || !u.admin) return;

    await app.sql.connect(async (sql: app.Sql) => {
      try {
        await sql.beginTransaction();
        await sql.query("DELETE FROM predio WHERE id = ?", [id]);
        await sql.commit();
        console.log("Prédio excluído com sucesso.");
        res.json(true);
      } catch (err) {
        await sql.rollback();
        console.error("Erro ao excluir prédio: ", err);
        res.status(500).json({ erro: "Erro no servidor." });
      }
    });
  }

  // Método para obter um prédio
  public static async obter(id: number) {
    return await app.sql.connect(async (sql: app.Sql) => {
      return await sql.query("SELECT * FROM predio WHERE id = ?", [id]);
    });
  }

  // Método para listar todos os prédios
  public static async listarTodos() {
    return await app.sql.connect(async (sql: app.Sql) => {
      return await sql.query("SELECT * FROM predio");
    });
  }
}

export = PredioRoute;
