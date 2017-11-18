module.exports = function (CDN, ROOT, BUILD, manifest, PROJECT_DEV, Settings, cb) {
	var fs = require('fs');
	var path = require('path');
	var Request = global.request;
	var UglifyJS = require("uglify-js");
	var util = require('./util');
	var shortid = require('shortid');
	console.log('- Bundle Application');

	function unlink(files, i, cb) {
		if (!files[i]) return cb();
		fs.unlink(PROJECT_DEV + path.sep + files[i], function () {
			unlink(files, i + 1, cb);
		})
	};
	fs.readFile(ROOT + path.sep + 'src' + path.sep + "Contents" + path.sep + "Application" + path.sep + "app.js", function (err, app) {
		app = app.toString('utf-8');
		var _apph = app.split("Ext.Loader.setConfig")[0];
		var _app = "Manifest" + app.split('Manifest')[1];
		var webapp = _apph + "\n" + _app;
		webapp = UglifyJS.minify(webapp).code;
		fs.readFile(PROJECT_DEV + path.sep + 'bootstrap.cache', function (e, bootstrap) {
			bootstrap = UglifyJS.minify(bootstrap.toString('utf-8')).code;
			fs.readFile(PROJECT_DEV + path.sep + 'library.pack', function (e, libraries) {
				libraries = UglifyJS.minify(libraries.toString('utf-8')).code;
				fs.readFile(PROJECT_DEV + path.sep + 'services.pack', function (e, services) {
					services = UglifyJS.minify(services.toString('utf-8')).code;
					fs.readFile(PROJECT_DEV + path.sep + 'i18n.pack', function (e, langs) {
						langs = UglifyJS.minify(langs.toString('utf-8')).code;
						fs.readFile(PROJECT_DEV + path.sep + 'objects.pack', function (e, objects) {
							objects = UglifyJS.minify(objects.toString('utf-8')).code;
							fs.writeFile(BUILD.www + path.sep + 'Contents' + path.sep + "Application.js", bootstrap + libraries + services + langs + objects + webapp, function () {
								console.log('- Cleaning temp files');
								var files = [
									"bootstrap.cache"
									, "i18n.pack"
									, "library.pack"
									, "objects.pack"
									, "services.pack"
									, "Settings.js"
								];
								unlink(files, 0, cb);
							});
						});
					});
				});
			});
		});
	});
}