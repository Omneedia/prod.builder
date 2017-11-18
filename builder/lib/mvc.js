module.exports = function (CDN, ROOT, BUILD, manifest, PROJECT_DEV, Settings, cb) {
	var fs = require('fs');
	var path = require('path');
	var Request = require('request');
	var util = require('./util');
	var shortid = require('shortid');
	var workspace = '';
	var PROCESSING_CTRLS = [];
	var PROCESSING_MODEL = [];
	var PROCESSING_STORE = [];
	var PROCESSING_VIEWS = [];
	var PVIEWS = [];
	console.log('- Building app');

	function getDistinctArray(arr) {
		var dups = {};
		return arr.filter(function (el) {
			var hash = el.valueOf();
			var isDup = dups[hash];
			dups[hash] = true;
			return !isDup;
		});
	};

	function process_models(model, i, cb) {
		if (!model) return cb();
		if (!model[i]) return cb();
		console.log('			+ adding ' + model[i]);
		fs.readFile(workspace + 'model' + path.sep + model[i].replace(/\./g, path.sep) + '.js', function (e, r) {
			if (e) util.error(ROOT, 'MODEL_NOT_FOUND');
			PROCESSING_MODEL.push(r.toString('utf-8'));
			process_models(model, i + 1, cb);
		});
	};

	function process_stores(store, i, cb) {
		if (!store) return cb();
		if (!store[i]) return cb();
		console.log('			+ adding ' + store[i]);
		fs.readFile(workspace + 'store' + path.sep + store[i].replace(/\./g, path.sep) + '.js', function (e, r) {
			if (e) util.error(ROOT, 'STORE_NOT_FOUND');
			PROCESSING_STORE.push(r.toString('utf-8'));
			process_stores(store, i + 1, cb);
		});
	};

	function process_views(views, i, cb) {
		if (!views) return cb();
		if (!views[i]) return cb();
		if (PVIEWS.indexOf(views[i]) > -1) return process_views(views, i + 1, cb);
		console.log('			+ adding ' + views[i]);
		fs.readFile(workspace + 'view' + path.sep + views[i].replace(/\./g, path.sep) + '.js', function (e, r) {
			if (e) util.error(ROOT, 'VIEW_NOT_FOUND');
			PROCESSING_VIEWS.push(r.toString('utf-8'));
			PVIEWS.push(views[i]);
			process_views(views, i + 1, cb);
		});
	};

	function getController(controllers, i, cb) {
		var controller = controllers[i];
		if (!controller) return cb();
		workspace = ROOT + path.sep + 'src' + path.sep + "Contents" + path.sep + "Application" + path.sep + "app" + path.sep;
		var _controller = workspace + "controller" + path.sep + controller.replace('.', path.sep) + ".js";
		console.log('	- adding controller ' + controller);
		fs.readFile(_controller, function (e, r) {
			if (e) util.error(ROOT, 'CONTROLLER_NOT_FOUND_OR_NOT_READABLE');
			PROCESSING_CTRLS.push(r.toString('utf-8'));
			var esprima = require('esprima');
			var tokens = esprima.tokenize(r.toString('utf-8'));
			var TOKENS = {};
			var bracket = false;
			var token = false;
			for (var el in tokens) {
				if (tokens[el].value == "views") token = "VIEWS";
				if (tokens[el].value == "models") token = "MODELS";
				if (tokens[el].value == "stores") token = "STORES";
				if (tokens[el].value == "[") bracket = true;
				if (tokens[el].value == "]") {
					bracket = false;
					token = false;
				};
				if (bracket) {
					if (token) {
						if (!TOKENS[token]) TOKENS[token] = [];
						if ((tokens[el].value != ",") && (tokens[el].value != "[")) TOKENS[token].push(tokens[el].value.replace(/"/g, ''));
					}
				}
			};
			console.log('		- processing models');
			process_models(TOKENS['MODELS'], 0, function () {
				console.log('		- processing stores');
				process_stores(TOKENS['STORES'], 0, function () {
					console.log('		- processing views');
					process_views(TOKENS['VIEWS'], 0, function () {
						getController(controllers, i + 1, cb);
					});
				});
			});
		});
	};
	var controllers = Settings.CONTROLLERS;
	getController(Settings.CONTROLLERS, 0, function () {
		console.log('- Packaging app');
		PROCESSING_CTRLS = getDistinctArray(PROCESSING_CTRLS);
		PROCESSING_MODEL = getDistinctArray(PROCESSING_MODEL);
		PROCESSING_STORE = getDistinctArray(PROCESSING_STORE);
		PROCESSING_VIEWS = getDistinctArray(PROCESSING_VIEWS);
		var Objects = '__MVC__=function() {' + PROCESSING_MODEL.join('\n') + PROCESSING_STORE.join('\n') + PROCESSING_VIEWS.join('\n') + PROCESSING_CTRLS.join('\n') + '}';
		fs.writeFile(PROJECT_DEV + path.sep + 'objects.pack', Objects, cb);
	});
}