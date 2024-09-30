import app = require("teem");
import Predio = require("../models/predio");
import Usuario = require("../models/usuario");

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
      if (isNaN(id) || !(item = await Predio.obter(id))) {
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
        xlsx: true,
        usuario: u,
        lista: await Predio.listar(),
      });
  }
}

export = PredioRoute;
