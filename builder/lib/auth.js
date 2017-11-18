module.exports = function(CDN,ROOT,BUILD,manifest,cb) {
	var fs = require('fs');
	var path = require('path');
	var Request = global.request;
	var shortid = require('shortid');
	var UglifyJS = require("uglify-js");

	var util = require('./util');
	
	function process_files(files,i,cb) {
		if (!files[i]) return cb();
		var file=files[i];
		if (path.extname(file)==".js") {
			fs.readFile(file,function(e,r) {
				if (e) util.error(ROOT,'AUTH_NOT_FOUND');
				var script = UglifyJS.minify(r.toString('utf-8'));
				fs.writeFile(BUILD.auth+path.sep+path.basename(file),script.code,function() {
					process_files(files,i+1,cb);	
				});
			});
		} else {
			// on copie le fichier tel quel
			var bpath=path.dirname(file).substr(ROOT.length,path.dirname(file).length);
			bpath=bpath.substr('/src/Contents/Auth'.length,bpath.length);
			if (file.indexOf('Profiler.json')!=-1) process_files(files,i+1,cb); else 
			util.mkdir(BUILD.api+bpath,function() {
				util.copyFile(file,BUILD.auth+bpath+path.sep+path.basename(file),function() {
					process_files(files,i+1,cb);	
				});
			});
		}
	};
			
	console.log('- Building Auth');
	
	util.walk(ROOT+path.sep+'src'+path.sep+'Contents'+path.sep+'Auth',function(e,files) {
		if (e) util.error(ROOT,"AUTH_NOT_FOUND");
		process_files(files,0,cb);
	});
	
	
}