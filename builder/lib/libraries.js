module.exports = function(CDN,ROOT,BUILD,manifest,PROJECT_DEV,Settings,cb) {
	var fs = require('fs');
	var path = require('path');
	var Request = global.request;
	var util = require('./util');
	var shortid = require('shortid');
	
	var PATH = {};	
	var pluscode = "";
	
	var REQUIRE = [];
	
	function download(o,i,callback,PACK) {
		if (!PACK) PACK=[];
		if (!o[i]) return callback(PACK);
		console.log('	- loading '+o[i]);
		if (o[i].indexOf('http')==-1) {
			fs.readFile(o[i],function(e,r) {
				if (e) util.error(ROOT,'SCRIPT_NOT_FOUND');
				PACK.push(r.toString('utf-8'));
				download(o,i+1,callback,PACK);
			});
		}
		else {
			Request({
				url: o[i]
				, encoding: null
			}, function (err, res, body) {
				if (res.statusCode==404) util.error(ROOT,o[i]+' SCRIPT_NOT_FOUND');
				try {
					PACK.push(body.toString('utf-8'));
					download(o,i+1,callback,PACK);
				}
				catch (ex) {
					console.log(ex);
					if (ex) util.error(ROOT,'SCRIPT_NOT_FOUND');
				}
			});
		};
	};	
	
	function loadModule(o,i,cb) {
		if (!o[i]) return cb();
		var base=o[i].split('.json')[0]+'/';
		Request({
			url: o[i]
			, encoding: null
		}, function (err, res, body) {
			if (err) util.error(ROOT,'MODULE_NOT_FOUND');
			if (res.statusCode==404) util.error(ROOT,o[i]+' MODULE_NOT_FOUND');
			try {
				var z=JSON.parse(body);
				if (z.package) {
					for (var j=0;j<z.package.js.length;j++) {
						var script=z.package.js[j];
						for (var el in z) {
							if ((el!="repositories") && (el!="package")) {
								var replace = "{"+el+"}";
								var re = new RegExp(replace,"g");
								script=script.replace(re,z[el]);
							};
						};
						if (script.indexOf('@')>-1) {
							var repositories=z.repositories;
							for (var el in repositories) {
								if (script.indexOf(el)>-1) {
									var replace = el;
									var re = new RegExp(replace,"g");
									script=script.replace(re,repositories[el]);
								}
							}
						} else script=base+script;
					};
					REQUIRE.push(script);
					loadModule(o,i+1,cb);
				} else util.error(ROOT,'MODULE_ERROR');
			} catch(e) {
				console.log(e);
				util.error(ROOT,'MODULE_ERROR');
			}
		});
	}
	
	console.log('- Building libraries');
	var app = ROOT + path.sep + "src" + path.sep + "Contents" + path.sep + "Application" + path.sep + "app.js";

	var _require = manifest.modules;

	for (var i=0;i<_require.length;i++) {
		var unit=_require[i];
		unit=unit.replace(/\./g,'/');
		for (var el in manifest.paths) {
			if (unit.indexOf(el)>-1) unit=manifest.paths[el]+unit.split(el)[1];
		};			
		_require[i]=unit+'.json';
	};
	loadModule(_require,0,function() {
		download(REQUIRE,0,function(PACK) {
			console.log('- Packaging library');
			var library = PACK.join('\n');	
			fs.writeFile(PROJECT_DEV+path.sep+'library.pack',library,function() {
				cb();
			});
		});
	});
	
}