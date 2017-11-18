/**
Omneedia Builder
**/
var shortid = require('shortid');
var fs = require('fs');
var path = require('path');
var shelljs = require('shelljs');
// util
var util = require('./lib/util');
// ClientSide //
var clean = require('./lib/clean');
var init = require('./lib/init');
var bootstrap = require('./lib/bootstrap');
var libraries = require('./lib/libraries');
var services = require('./lib/services');
var mvc = require('./lib/mvc');
var i18n = require('./lib/i18n');
var bundle = require('./lib/bundle');
var build_index = require('./lib/build_index');
// Resources //
var resources = require('./lib/resources');
// ServerSide //
var api = require('./lib/api');
var sys = require('./lib/sys');
var auth = require('./lib/auth');
var json = require('./lib/json');
// Docker //
var dockerfile = require('./lib/dockerfile');
////////////////////////
var CDN = "http://cdn.omneedia.com";
var TPL_PROD = "https://github.com/Omneedia/tpl.omneedia.production";

function build_client_mobile(CDN, ROOT, BUILD, Manifest, PROJECT_DEV, cb) {};

function build_client_webapp(CDN, ROOT, BUILD, Manifest, PROJECT_DEV, cb) {
	/*
	resources(CDN,ROOT,BUILD,Manifest,PROJECT_DEV,function() {
		build_index(CDN,ROOT,BUILD,Manifest,PROJECT_DEV,cb);
	});
	*/
	bootstrap(CDN, ROOT, BUILD, Manifest, PROJECT_DEV, function (Settings) {
		libraries(CDN, ROOT, BUILD, Manifest, PROJECT_DEV, Settings, function () {
			services(CDN, ROOT, BUILD, Manifest, PROJECT_DEV, Settings, function () {
				i18n(CDN, ROOT, BUILD, Manifest, PROJECT_DEV, Settings, function () {
					mvc(CDN, ROOT, BUILD, Manifest, PROJECT_DEV, Settings, function () {
						bundle(CDN, ROOT, BUILD, Manifest, PROJECT_DEV, Settings, function () {
							resources(CDN, ROOT, BUILD, Manifest, PROJECT_DEV, Settings, function () {
								build_index(CDN, ROOT, BUILD, Manifest, PROJECT_DEV, Settings, cb);
							});
						});
					});
				});
			});
		});
	});
};

function build_server(CDN, ROOT, BUILD, Manifest, PROJECT_DEV, cb) {
	api(CDN, ROOT, BUILD, Manifest, function () {
		sys(CDN, ROOT, BUILD, Manifest, function () {
			auth(CDN, ROOT, BUILD, Manifest, function () {
				json(CDN, ROOT, BUILD, Manifest, function () {
					// Docker
					dockerfile(CDN, ROOT, BUILD, Manifest, function () {
						util.removeRecursive(ROOT, cb);
					});
				});
			});
		});
	});
};

function build(name, cb) {
	var UID = shortid.generate();
	var BUILD = {
		base: __dirname + path.sep + "var" + path.sep + UID + ".app"
		, api: __dirname + path.sep + "var" + path.sep + UID + ".app" + path.sep + "Contents" + path.sep + "api"
		, auth: __dirname + path.sep + "var" + path.sep + UID + ".app" + path.sep + "Contents" + path.sep + "auth"
		, etc: __dirname + path.sep + "var" + path.sep + UID + ".app" + path.sep + "Contents" + path.sep + "etc"
		, var: __dirname + path.sep + "var" + path.sep + UID + ".app" + path.sep + "Contents" + path.sep + "var"
		, www: __dirname + path.sep + "var" + path.sep + UID + ".app" + path.sep + "Contents" + path.sep + "www"
	};
	var ROOT = __dirname + path.sep + "var" + path.sep + UID;
	var PROJECT_DEV = ROOT + path.sep + "dev";
	var Manifest = ROOT + path.sep + "app.manifest";
	init(ROOT, BUILD, Manifest, TPL_PROD, name, function (Manifest) {
		for (var el in Manifest.paths) {
			for (var elx in Manifest.paths) {
				if (Manifest.paths[el].indexOf(elx) > -1) Manifest.paths[el] = Manifest.paths[elx] + Manifest.paths[el].split(elx)[1];
			};
		};
		if (Manifest.platform == "mobile") build_client_mobile(CDN, ROOT, BUILD, Manifest, PROJECT_DEV, function () {});
		if (Manifest.platform == "webapp") build_client_webapp(CDN, ROOT, BUILD, Manifest, PROJECT_DEV, function () {
			build_server(CDN, ROOT, BUILD, Manifest, PROJECT_DEV, cb);
		});
	});
};
console.log(' ');
var Request = require('request');
var obj = {};
if (process.env['DOCKER_PROXY'] != "-1") {
	obj = {
		'proxy': process.env['DOCKER_PROXY']
	};
	shelljs.exec('git config --global http.proxy ' + process.env['DOCKER_PROXY']);
}
else {
	shelljs.exec('git config --global --unset http.proxy', {
		silent: true
	});
};
global.request = Request.defaults(obj);
clean(function () {
	console.log('- Cleaned.');
	build(process.env['DOCKER_GIT'], function (e, r) {
		console.log(e);
	});
});