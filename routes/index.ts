import app = require("teem");
import appsettings = require("../appsettings");
import Usuario = require("../models/usuario");
import Local = require("../models/local");
import Predio = require("../models/predio");

class IndexRoute {
	public static async index(req: app.Request, res: app.Response) {
		let u = await Usuario.cookie(req);
		if (!u)
			res.redirect(app.root + "/login");
		else
			res.redirect(app.root + "/tour/listar");
			//res.render("index/index", {
			//	layout: "layout-sem-form",
			//	titulo: "Dashboard",
			//	usuario: u
			//});
	}

	@app.http.all()
	public static async login(req: app.Request, res: app.Response) {
		let u = await Usuario.cookie(req);
		if (!u) {
			const token = req.query["token"] as string;

			if (token) {
				const [mensagem, u] = await Usuario.efetuarLogin(token, res);
				if (mensagem)
					res.render("index/login", { layout: "layout-externo", mensagem: mensagem, ssoRedir: appsettings.ssoRedir });
				else
					res.redirect(app.root + "/");
			} else {
				res.render("index/login", { layout: "layout-externo", mensagem: null, ssoRedir: appsettings.ssoRedir });
			}
		} else {
			res.redirect(app.root + "/");
		}
	}

	public static async acesso(req: app.Request, res: app.Response) {
		let u = await Usuario.cookie(req);
		if (!u)
			res.redirect(app.root + "/login");
		else
			res.render("index/acesso", {
				layout: "layout-sem-form",
				titulo: "Sem Permissão",
				usuario: u
			});
	}

	public static async perfil(req: app.Request, res: app.Response) {
		let u = await Usuario.cookie(req);
		if (!u)
			res.redirect(app.root + "/");
		else
			res.render("index/perfil", {
				titulo: "Meu Perfil",
				usuario: u
			});
	}

	public static async logout(req: app.Request, res: app.Response) {
		let u = await Usuario.cookie(req);
		if (u)
			await Usuario.efetuarLogout(u, res);
		res.redirect(app.root + "/");
	}

	@app.http.hidden()
	private static async visitaInterna(req: app.Request, res: app.Response, offline: boolean, manifest_webmanifest: boolean, sw_js: boolean) {
		const url = req.params["url"];
		let predio: Predio | null;
		if (!url || !(predio = await Predio.obterPorUrl(url))) {
			res.render("index/erro", { layout: "layout-externo", mensagem: "Não foi possível encontrar esse tour", erro: "Não foi possível encontrar esse tour" });
		} else if (!predio.locais || !predio.locais.length) {
			res.render("index/erro", { layout: "layout-externo", mensagem: "Não há locais cadastrados para esse tour", erro: "Não há locais cadastrados para esse tour" });
		} else {
			if (manifest_webmanifest)
				res.contentType("application/manifest+json");
			else if (sw_js)
				res.contentType("text/javascript");

			res.render(manifest_webmanifest ? "index/manifest" : (sw_js ? "index/sw" : "index/visita"), {
				layout: "layout-vazio",
				predio,
				offline,
			});
		}
	}

	@app.route.methodName("virtual/:url")
	public static visita(req: app.Request, res: app.Response) {
		let originalUrl = req.originalUrl;
		let queryString = "";
		const i = originalUrl.indexOf("?");
		if (i >= 0) {
			queryString = originalUrl.substring(i);
			originalUrl = originalUrl.substring(0, i);
		}
		if (originalUrl.charAt(originalUrl.length - 1) != "/") {
			res.redirect(`${app.root}/virtual/${req.params["url"]}/${queryString}`);
			return;
		}

		return IndexRoute.visitaInterna(req, res, false, false, false);
	}

	@app.route.methodName("app/:url")
	public static async visitaOffline(req: app.Request, res: app.Response) {
		let originalUrl = req.originalUrl;
		let queryString = "";
		const i = originalUrl.indexOf("?");
		if (i >= 0) {
			queryString = originalUrl.substring(i);
			originalUrl = originalUrl.substring(0, i);
		}
		if (originalUrl.charAt(originalUrl.length - 1) != "/") {
			res.redirect(`${app.root}/app/${req.params["url"]}/${queryString}`);
			return;
		}

		return IndexRoute.visitaInterna(req, res, true, false, false);
	}

	@app.route.methodName("app/:url/manifest.webmanifest")
	public static async manifest_webmanifest(req: app.Request, res: app.Response) {
		return IndexRoute.visitaInterna(req, res, true, true, false);
	}

	@app.route.methodName("app/:url/sw")
	public static async sw_js(req: app.Request, res: app.Response) {
		return IndexRoute.visitaInterna(req, res, true, false, true);
	}

	@app.route.methodName("app/:url/imagem/:id")
	public static async imagem(req: app.Request, res: app.Response) {
		await Local.obterImagem(res, parseInt(req.params["id"]));
	}

	@app.route.methodName("app/:url/assets/:a?/:b?/:c?/:d?/:e?/:f?/:g?/:h?/:i?/:j?")
	public static async assets(req: app.Request, res: app.Response) {
		let url = req.originalUrl;
		let i = url.indexOf("?");
		if (i >= 0)
			url = url.substring(0, i);
		i = url.indexOf("assets/");

		if (i < 0 || !(url = url.substring(i + 7)) || !(await app.fileSystem.exists(url = ("public/" + url)))) {
			res.status(404).json("Não encontrado");
			return;
		}

		res.sendFile(app.fileSystem.absolutePath(url));
	}
}

export = IndexRoute;
