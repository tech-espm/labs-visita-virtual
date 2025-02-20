import app = require("teem");
import Local = require("../models/local");
import Usuario = require("../models/usuario");

class LocalRoute {
  // Renderiza a página de criação
  public static async criar(req: app.Request, res: app.Response) {
    let u = await Usuario.cookie(req);
    if (!u)
      res.redirect(app.root + "/acesso");
    else
      res.render("local/editar", {
        titulo: "Criar Local",
        textoSubmit: "Criar",
        usuario: u,
        item: null,
        usuarios: (u.admin ? await Usuario.listarCombo() : null),
      });
  }

  // Renderiza a página de edição
  public static async editar(req: app.Request, res: app.Response) {
    let u = await Usuario.cookie(req);
    if (!u) {
      res.redirect(app.root + "/acesso");
    } else {
      let id = parseInt(req.query["id"] as string);
      let item: any = null;
      if (isNaN(id) || !(item = await Local.obter(id, u.id, u.idperfil))) {
        res.render("index/nao-encontrado", {
          layout: "layout-sem-form",
          usuario: u,
        });
      } else
        res.render("local/editar", {
          titulo: "Editar Local",
          usuario: u,
          item: item,
          usuarios: (u.admin ? await Usuario.listarCombo() : null),
        });
    }
  }

  // Renderiza a lista de locais
  public static async listar(req: app.Request, res: app.Response) {
    let u = await Usuario.cookie(req);
    if (!u)
      res.redirect(app.root + "/acesso");
    else
      res.render("local/listar", {
        layout: "layout-tabela",
        titulo: "Gerenciar Locais",
        datatables: true,
        xlsx: true,
        usuario: u,
        lista: await Local.listar(),
      });
  }
}

export = LocalRoute;
