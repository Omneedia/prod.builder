module.exports = function(CDN,ROOT,BUILD,manifest,PROJECT_DEV,Settings,cb) {
	var fs = require('fs');
	var path = require('path');
	var Request = require('request');
	var UglifyJS = require("uglify-js");
	var util = require('./util');
	var shortid = require('shortid');
		
	console.log('- Processing services');

	var result = [];
	
	function register_service(API,i,cb) {
		if (!API[i]) return cb();
		console.log('	- adding service '+API[i]);
		var REMOTE_API = {};
		REMOTE_API.url = "/api";
		REMOTE_API.type = "remoting";
		REMOTE_API.namespace = "App";
		REMOTE_API.descriptor = "App.REMOTING_API";
		REMOTE_API.actions = {};
		REMOTE_API.actions[API[i]] = [];
		fs.stat(ROOT + path.sep + "src" + path.sep + "Contents" + path.sep + "Services" + path.sep + API[i] + ".js",function(e,r) {
			if (e) util.error(ROOT,'SERVICE_NOT_FOUND');
			var _api = require(ROOT + path.sep + "src" + path.sep + "Contents" + path.sep + "Services" + path.sep + API[i] + ".js");
			for (var e in _api) {
				if (_api[e].toString().substr(0, 8) == "function") {
					var obj = {};
					obj.name = e;
					var myfn = _api[e].toString().split('function')[1].split('{')[0].trim().split('(')[1].split(')')[0].split(',');
					obj.len = myfn.length - 1;
					REMOTE_API.actions[API[i]][REMOTE_API.actions[API[i]].length] = obj;
				}
			};
			var str = "if (Ext.syncRequire) Ext.syncRequire('Ext.direct.Manager');Ext.namespace('App');";
			str += "App.REMOTING_API=" + JSON.stringify(REMOTE_API, null) + ";";
			str += "Ext.Direct.addProvider(App.REMOTING_API);";
			if (Settings.REMOTE_API) str = str.replace('App.REMOTING_API={"url":"', 'App.REMOTING_API={"url":"' + Settings.REMOTE_API); else str = str.replace('App.REMOTING_API={"url":"', 'App.REMOTING_API={"url":document.location.origin+"');
			result.push(str);	
			register_service(API,i+1,cb)
		});
	};
	
	result.push("if (Ext.syncRequire) Ext.syncRequire('Ext.direct.Manager');Ext.namespace('App');");

	var REMOTE_API = {};
	REMOTE_API.url = "/api";
	REMOTE_API.type = "remoting";
	REMOTE_API.namespace = "App";
	REMOTE_API.descriptor = "App.REMOTING_API";
	REMOTE_API.actions = {};
	REMOTE_API.actions["__QUERY__"] = [];
	REMOTE_API.actions["__QUERY__"].push({
		name: "exec"
		, len: 1
	});
	REMOTE_API.actions["__QUERY__"].push({
		name: "post"
		, len: 3
	});
	REMOTE_API.actions["__QUERY__"].push({
		name: "del"
		, len: 3
	});
	var str = "if (Ext.syncRequire) Ext.syncRequire('Ext.direct.Manager');Ext.namespace('App');";
	str += "App.REMOTING_API=" + JSON.stringify(REMOTE_API, null) + ";";
	str += "Ext.Direct.addProvider(App.REMOTING_API);";
		
	if (Settings.REMOTE_API) str = str.replace('App.REMOTING_API={"url":"', 'App.REMOTING_API={"url":"' + Settings.REMOTE_API); else str = str.replace('App.REMOTING_API={"url":"', 'App.REMOTING_API={"url":document.location.origin+"');
	result.push(str);
	
	register_service(Settings.API,1,function() {
		console.log('- Registering services');
		var services = UglifyJS.minify(result.join('\n'));
		fs.writeFile(PROJECT_DEV+path.sep+'services.pack',services.code,function() {
			cb();
		});
	});
	
}