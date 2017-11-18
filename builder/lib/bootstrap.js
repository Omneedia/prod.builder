module.exports = function (CDN, ROOT, BUILD, manifest, PROJECT_DEV, cb) {
	var fs = require('fs');
	var path = require('path');
	var htmlparser = require('htmlparser2');
	var Request = global.request;
	var util = require('./util');
	// make Settings
	function do_settings(cb) {
		Settings = {
			NAMESPACE: manifest.namespace
			, TITLE: manifest.title
			, DESCRIPTION: manifest.description
			, COPYRIGHT: manifest.copyright
			, TYPE: manifest.type, //REMOTE_API: "http://127.0.0.1:3000",
			TYPE: manifest.platform
			, LANGS: manifest.langs
			, AUTH: {
				passports: [

				]
				, passport: {}
			}
		};
		for (var i = 0; i < manifest.auth.length; i++) {
			var t0 = __dirname + path.sep + "auth.template" + path.sep + manifest.auth[i] + ".config";
			if (fs.existsSync(t0)) {
				t0 = JSON.parse(fs.readFileSync(t0, 'utf-8'));
				Settings.AUTH.passports.push(t0.type);
				Settings.AUTH.passport[t0.type] = {
					caption: "PASSPORT_" + manifest.auth[i].toUpperCase()
				};
			}
		};
		/*var frameworks = [];
		var resources = [];
		for (var i = 0; i < manifest.frameworks.length; i++) {
			var m = manifest.frameworks[i];
			if (m.src) {
				if (m.src.constructor === Array) {
					for (var zz = 0; zz < m.src.length; zz++) {
						var src = m.src[zz].replace(/{version}/g, m.version);
						src = src.replace(/{theme}/g, m.theme);
						src = src.replace(/{style}/g, m.style);
						frameworks.push(src);
					}
				}
				else {
					var src = m.src.replace(/{version}/g, m.version);
					src = src.replace(/{theme}/g, m.theme);
					src = src.replace(/{style}/g, m.style);
					frameworks.push(src);
				}
			};
			if (m.res) {
				if (m.res.constructor === Array) {
					for (var zz = 0; zz < m.res.length; zz++) {
						var res = m.res[zz].replace(/{version}/g, m.version);
						res = res.replace(/{theme}/g, m.theme);
						res = res.replace(/{style}/g, m.style);
						resources.push(res);
					}
				}
				else {
					var res = m.res.replace(/{version}/g, m.version);
					res = res.replace(/{theme}/g, m.theme);
					res = res.replace(/{style}/g, m.style);
					resources.push(res);
				}
			};
		};
		*/
		/*Settings.FRAMEWORKS = frameworks;
		Settings.RESOURCES = resources;
		if (manifest.platform == "webapp") {
			Settings.RESOURCES.push(CDN + "/omneedia/res/webapp.css");
			Settings.RESOURCES.push("Contents/Resources/webapp.css");
		};
		if (manifest.platform == "mobile") {
			Settings.RESOURCES.push(CDN + "/omneedia/res/mobi.css");
			Settings.RESOURCES.push("Contents/Resources/mobi.css");
		};
		if (manifest.libraries) Settings.LIBRARIES = manifest.libraries;
		else*/ 
		Settings.LIBRARIES = [];
		fs.readFile(__dirname + require('path').sep + 'omneedia.modules', function (e, r) {
			if (e) {
				util.error(ROOT, "OMNEEDIA_MODULES_NOT_FOUND");
				return false;
			};
			try {
				var SETMODULES = JSON.parse(r.toString('utf-8'));
			}
			catch (e) {
				util.error(ROOT, "OMNEEDIA_MODULES_UNREADABLE")
			};

			Settings.CONTROLLERS = [];
			for (var i = 0; i < manifest.controllers.length; i++) Settings.CONTROLLERS.push(manifest.controllers[i]);

			//for (var i = 0; i < manifest.modules.length; i++) 
			
			Settings.MODULES = [];

			Settings.AUTHORS = [];
			Settings.DB = [];
			
			Settings.API = [];
			Settings.API.push('__QUERY__');
			for (var i = 0; i < manifest.api.length; i++) Settings.API.push(manifest.api[i]);
			Settings.AUTHORS.push({
				role: "creator"
				, name: manifest.author.name
				, mail: manifest.author.mail
				, twitter: manifest.author.twitter
				, web: manifest.author.web
				, github: manifest.author.github
			});
			for (var el in manifest.team) {
				var tabx = manifest.team[el];
				var role = el;
				for (var i = 0; i < tabx.length; i++) {
					Settings.AUTHORS.push({
						role: role
						, name: tabx[i].name
						, mail: tabx[i].mail
						, twitter: tabx[i].twitter
						, web: tabx[i].web
						, github: tabx[i].github
					});
				};
			};
			Settings.VERSION = manifest.version;
			Settings.BUILD = manifest.build;
			
			//Settings.CDN = CDN;
			
			if (manifest.blur) Settings.blur = manifest.blur;
			else Settings.blur = 1;
			/* REMOTES
			try {
				if (MSettings) {
					if (MSettings.remote) {
						if (MSettings.remote.auth) {
							Settings.REMOTE_AUTH = MSettings.remote.auth;
						}
						if (MSettings.remote.api) {
							Settings.REMOTE_API = MSettings.remote.api;
						}
					};
				};
			}
			catch (e) {};

			*/
			cb(Settings);
		});
	};

	function do_bootstrap(cb) {
		var BOOTSTRAP_FILES = [PROJECT_DEV + path.sep + "Settings.js"];
		console.log('- Building bootstrap');

		function loadModule(module, cb) {
			global.request(module, function (e, r, b) {
				if (e) util.error(ROOT, module + ' MODULE_NOT_FOUND');
				var list = JSON.parse(b);
				var base = module.substr(0, module.lastIndexOf('/') + 1);
				for (var i = 0; i < list.length; i++) {
					list[i] = base + list[i];
				};
				cb(list);
			});
		};

		function decodeURL(urls, i, cb) {
			if (!urls[i]) return cb();
			var url = urls[i].src;
			var framework = urls[i].framework;
			for (var el in framework) {
				if ((el != "src") && (el != "i18n") && (el != "res")) {
					var replace = '{' + el + '}';
					var re = new RegExp(replace, "g");
					url = url.replace(re, framework[el]);
				}
			};
			for (var el in manifest.paths) {
				if (url.indexOf(el) > -1) url = manifest.paths[el] + url.split(el)[1];
			};
			if (url.indexOf('modules.js') > -1) {
				loadModule(url, function (arr) {
					BOOTSTRAP_FILES = BOOTSTRAP_FILES.concat(arr);
					decodeURL(urls, i + 1, cb);
				});
			}
			else {
				BOOTSTRAP_FILES.push(url);
				decodeURL(urls, i + 1, cb);
			}
		};

		function download(bootstraps, i, RESULT, callback) {
			if (!bootstraps[i]) return callback(RESULT);
			console.log('	- loading ' + bootstraps[i]);
			if (bootstraps[i].indexOf('http') == -1) {
				fs.readFile(bootstraps[i], function (e, r) {
					if (e) util.error(ROOT, 'SCRIPT_NOT_FOUND');
					var text = r.toString('utf-8');
					if (bootstraps[i].indexOf('Settings.js') > -1) {
						try {
							var settings = JSON.parse(text);
							var extend = require('util')._extend;
							var _JSON = extend({}, settings);
							delete(_JSON.FRAMEWORKS);
							delete(_JSON.LIBRARIES);
							delete(_JSON.RESOURCES);
							delete(_JSON.PLUGINS);
							delete(_JSON.SIGN);
							var text = "Settings=" + JSON.stringify(_JSON) + ';';
							// ??? var __SOCKET__=
						}
						catch (e) {
							util.error(ROOT, 'SETTINGS_MISMATCHED');
						};
					};
					RESULT.push(text);
					download(bootstraps, i + 1, RESULT, callback)
				});
			}
			else {
				Request({
					url: bootstraps[i]
					, encoding: null
				}, function (err, res, body) {
					try {
						RESULT.push(body.toString());
						download(bootstraps, i + 1, RESULT, callback);
					}
					catch (ex) {
						util.error(ROOT, 'SCRIPT_NOT_FOUND');
					}
				});
			};
		};
		var frameworks = manifest.frameworks;
		var urls = [];
		for (var i = 0; i < frameworks.length; i++) {
			var framework = frameworks[i];
			if (typeof framework.src === "string") urls.push({
				framework: framework
				, src: framework.src
			});
			else {
				for (var j = 0; j < framework.src.length; j++) {
					urls.push({
						framework: framework
						, src: framework.src[j]
					});
				};
			}
		};
		decodeURL(urls, 0, function () {
			download(BOOTSTRAP_FILES, 0, [], function (results) {
				console.log('- Packaging bootstrap cache');
				var bootstrap = results.join('\n');
				fs.writeFile(PROJECT_DEV + path.sep + 'bootstrap.cache', bootstrap, function () {
					cb();
				});
			});
		});
	};
	do_settings(function (Settings) {
		fs.writeFile(PROJECT_DEV + path.sep + "Settings.js", JSON.stringify(Settings), function () {
			do_bootstrap(function () {
				//console.log('done.');
				cb(Settings);
			});
		});
	});
};