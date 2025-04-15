import app = require("teem");
import Link = require("../../models/link");
import Usuario = require("../../models/usuario");

class LinkRoute {
	@app.http.post()
	@app.route.formData()
	public static async criar(req: app.Request, res: app.Response) {
		const u = await Usuario.cookie(req, res);
		if (!u)
			return;

		const erro = await Link.criar(req.body, u.id, u.idperfil);

		if (erro) {
			res.status(400).json(erro);
			return;
		}

		res.sendStatus(204);
	}

	@app.http.post()
	@app.route.formData()
	public static async editar(req: app.Request, res: app.Response) {
		const u = await Usuario.cookie(req, res);
		if (!u)
			return;

		const erro = await Link.editar(req.body, u.id, u.idperfil);

		if (erro) {
			res.status(400).json(erro);
			return;
		}

		res.sendStatus(204);
	}

	@app.http.delete()
	public static async excluir(req: app.Request, res: app.Response) {
		const u = await Usuario.cookie(req, res);
		if (!u)
			return;

		const id = parseInt(req.query["id"] as string);

		if (isNaN(id)) {
			res.status(400).json("Id inválido");
			return;
		}

		const erro = await Link.excluir(id, u.id, u.idperfil);

		if (erro) {
			res.status(400).json(erro);
			return;
		}

		res.sendStatus(204);
	}
}

export = LinkRoute;
