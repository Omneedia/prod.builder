module.exports = function(CDN,ROOT,BUILD,manifest,cb) {
	var fs = require('fs');
	var path = require('path');
	var Request = global.request;
	var shortid = require('shortid');
	
	var packages = manifest.packages; 	fs.writeFile(BUILD.base+path.sep+'Contents'+path.sep+'app.manifest',JSON.stringify(manifest),function() {
		fs.readFile(BUILD.base+path.sep+'Contents'+path.sep+'package.json',function(e,r) {
			if (e) util.error(ROOT,'PACKAGE_JSON_NOT_FOUND');
			r=r.toString('utf-8');
			try {
				r=JSON.parse(r);
			} catch(e) {
				util.error(ROOT,'PACKAGE_JSON_NOT_READABLE');
			};
			for (var i=0;i<packages.length;i++) {
				var p=packages[i].split(':');
				if (p[1]) var version=p[1]; else var version="";
				r.dependencies[p[0]]=version;
			};
			fs.writeFile(BUILD.base+path.sep+'Contents'+path.sep+'package.json',JSON.stringify(r),cb);			
		});
	});
	
}