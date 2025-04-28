import app = require("teem");
import Link = require("../models/link");
import Usuario = require("../models/usuario");

class LinkRoute {
  // Renderiza a página de criação
  public static async criar(req: app.Request, res: app.Response) {
    let u = await Usuario.cookie(req);
    if (!u)
      res.redirect(app.root + "/acesso");
    else
      res.render("link/editar", {
        titulo: "Criar Link",
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
      if (isNaN(id) || !(item = await Link.obter(id, u.id, u.idperfil))) {
        res.render("index/nao-encontrado", {
          layout: "layout-sem-form",
          usuario: u,
        });
      } else
        res.render("link/editar", {
          titulo: "Editar Link",
          usuario: u,
          item: item,
          usuarios: (u.admin ? await Usuario.listarCombo() : null),
        });
    }
  }

  public static async listar(req: app.Request, res: app.Response) {
    let u = await Usuario.cookie(req);
    if (!u)
      res.redirect(app.root + "/acesso");
    else
      res.render("link/listar", {
        layout: "layout-tabela",
        titulo: "Gerenciar Links",
        datatables: true,
        xlsx: true,
        usuario: u,
        lista: await Link.listar(),
      });
  }
}

export = LinkRoute;
