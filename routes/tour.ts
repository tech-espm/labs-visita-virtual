import app = require("teem");
import Predio = require("../models/predio");
import Usuario = require("../models/usuario");

class PredioRoute {
  // Renderiza a página de criação
  public static async criar(req: app.Request, res: app.Response) {
    let u = await Usuario.cookie(req);
    if (!u)
      res.redirect(app.root + "/acesso");
    else
      res.render("predio/editar", {
        titulo: "Criar Tour",
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
      if (isNaN(id) || !(item = await Predio.obter(id, u.id, u.idperfil))) {
        res.render("index/nao-encontrado", {
          layout: "layout-sem-form",
          usuario: u,
        });
      } else
        res.render("predio/editar", {
          titulo: "Editar Tour",
          usuario: u,
          item: item,
          usuarios: (u.admin ? await Usuario.listarCombo() : null),
        });
    }
  }

  // Renderiza a lista de tours
  public static async listar(req: app.Request, res: app.Response) {
    let u = await Usuario.cookie(req);
    if (!u)
      res.redirect(app.root + "/acesso");
    else
      res.render("predio/listar", {
        layout: "layout-tabela",
        titulo: "Gerenciar Tours",
        datatables: true,
        xlsx: true,
        usuario: u,
        lista: await Predio.listar(u.id, u.idperfil),
      });
  }
}

export = PredioRoute;
