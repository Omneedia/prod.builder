module.exports = function(ROOT,BUILD,Manifest,TPL_PROD,name,cb) {
	var fs = require('fs');
	var path = require('path');
	var shelljs = require('shelljs');
	var util = require('./util');
	function mkdir(dirs,i) {
		if (!dirs[i]) return cb(Manifest);
		fs.mkdir(dirs[i],function() {
			mkdir(dirs,i+1);
		})
	};
	fs.mkdir(ROOT,function() {
	fs.mkdir(BUILD.base,function() {
		console.log('- Loading project');
		shelljs.exec('git clone '+name+' "'+ROOT+'"',{silent:true},function(a,b,c) {
			fs.stat(Manifest,function(e,r) {
				if (e) {
					util.removeRecursive(ROOT,function() {
						cb("NOT_FOUND",null);	
					});
					return false;
				};
				fs.readFile(Manifest,function(e,r) {
					if (e) {
						util.removeRecursive(ROOT,function() {
							cb("INCORRECT_MANIFEST",null);	
						});
						return;
					};
					try {
						Manifest = JSON.parse(r.toString('utf-8'));
						shelljs.exec('git clone '+TPL_PROD+' "'+BUILD.base+'"',{silent:true},function(a,b,c) {
							util.removeRecursive(BUILD.base+path.sep+'.git',function() {
								fs.unlink(BUILD.base+path.sep+'.gitignore',function() {
									var dirs=[
										BUILD.api,
										BUILD.auth,
										BUILD.etc,
										BUILD.var,
										BUILD.www,
										BUILD.www+path.sep+'Contents',
										ROOT+path.sep+"dev"
									];
									mkdir(dirs,0);
								});
							});
						});							
					} catch(e) {
						util.removeRecursive(ROOT,function() {
							cb("INCORRECT_MANIFEST",null);	
						});
						return;
					}
				});
			});
		});
	});	
});
};