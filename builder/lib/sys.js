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
				if (e) util.error(ROOT,'SYS_NOT_FOUND');
				var script = UglifyJS.minify(r.toString('utf-8'));
				fs.writeFile(BUILD.var+path.sep+path.basename(file),script.code,function() {
					process_files(files,i+1,cb);	
				});
			});
		} else {
			// on copie le fichier tel quel
			var bpath=path.dirname(file).substr(ROOT.length,path.dirname(file).length);
			bpath=bpath.substr('/src/System'.length,bpath.length);
			util.mkdir(BUILD.var+bpath,function() {
				util.copyFile(file,BUILD.var+bpath+path.sep+path.basename(file),function() {
					process_files(files,i+1,cb);	
				});
			});
		}
	};
			
	console.log('- Building system');
	
	util.walk(ROOT+path.sep+'src'+path.sep+'System',function(e,files) {
		if (e) util.error(ROOT,"SYSTEM_NOT_FOUND");
		process_files(files,0,cb);
	});
	
	
}