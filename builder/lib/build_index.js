module.exports = function(CDN,ROOT,BUILD,manifest,PROJECT_DEV,Settings,cb) {
	var fs = require('fs');
	var path = require('path');
	var Request = global.request;
	var UglifyCSS = require("uglifycss");
	var shortid = require('shortid');
	var IM = require("jimp");

	var util = require('./util');
	
	var result = [];
			
	console.log('- Building index');
	
	function b64(f,cb) {
		if (f.indexOf('logo.png')>-1) {
			IM.read(ROOT + '/' +manifest.icon.file, function (err, img) {
				img.resize(256,256).getBuffer(IM.MIME_PNG, function(err, buffer){
             		cb(buffer.toString('base64'));
         		});
			});
		};
		if (f.indexOf('favicon.ico')>-1) {
			IM.read(ROOT + '/' +manifest.icon.file, function (err, img) {
				img.resize(16,16).getBuffer(IM.MIME_PNG, function(err, buffer){
             		cb(buffer.toString('base64'));
         		});
			});	
		};
	};
	
	function res_html_compile() {
		if (Settings.TYPE == "mobile") {
			var css = "";
			var tpl = fs.readFileSync(ROOT + path.sep + ".style", "utf-8");
			tpl = tpl.replace(/{COLOR}/g, Manifest.splashscreen.background);
			tpl = tpl.replace(/{BKCOLOR}/g, Manifest.splashscreen.color);
			tpl = tpl.replace(/{TITLE}/g, Manifest.title);
			tpl = tpl.replace(/{DESCRIPTION}/g, Manifest.description);
			tpl = tpl.replace(/{ICON}/g, 'data:image/png;base64,' + b64(ROOT + path.sep + "src" + path.sep + "Contents" + path.sep + "Resources" + path.sep + "startup" + path.sep + "logo.png"));
			var link = require('sqwish').minify(tpl);
			var tpl = fs.readFileSync(ROOT + path.sep + '.template', 'utf-8');
			tpl = tpl.replace(/{COLOR}/g, Manifest.splashscreen.background);
			tpl = tpl.replace(/{BKCOLOR}/g, Manifest.splashscreen.color);
			tpl = tpl.replace(/{TITLE}/g, Manifest.title);
			tpl = tpl.replace(/{DESCRIPTION}/g, Manifest.description);
			//tpl = tpl.replace(/{ICON}/g, "Contents/Resources/startup/logo.png");
			
			if (process.argv.indexOf("unsafe") > -1) tpl = tpl.replace('<head>', '<head><meta http-equiv="Content-Security-Policy" content="img-src: \'self\' data:;default-src * data:; style-src \'self\' \'unsafe-inline\'; script-src \'self\' \'unsafe-inline\' \'unsafe-eval\'">');
			tpl = tpl.replace('<head>', '<head><meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">');
			var launcher = fs.readFileSync(__dirname + path.sep + 'tpl' + path.sep + 'oa' + path.sep + 'bootstrap_mobi.tpl');
			tpl = tpl.replace('</head>', '<style type="text/css">' + link + '</style></head>');
			tpl = tpl.replace('</body>', launcher + '</body>');
			var minify = require('html-minifier').minify;
			var min = minify(tpl.replace(/\t/g, '').replace(/\n/g, ''));
			fs.writeFileSync(PROJECT_DEV + path.sep + "index.html", min);
		};
		if (Settings.TYPE == "webapp") {
			fs.readFile(ROOT + path.sep + ".style",function(e,tpl) {
				if (e) util.error(ROOT,'TPL_NOT_FOUND');
				tpl = tpl.toString('utf-8');
				tpl = tpl.replace(/{COLOR}/g, manifest.splashscreen.background);
				tpl = tpl.replace(/{BKCOLOR}/g, manifest.splashscreen.color);
				tpl = tpl.replace(/{TITLE}/g, manifest.title);
				tpl = tpl.replace(/{DESCRIPTION}/g, manifest.description);
				b64(ROOT + path.sep + "src" + path.sep + "Contents" + path.sep + "Resources" + path.sep + "startup" + path.sep + "logo.png",function(img) {
					tpl = tpl.replace(/{ICON}/g, 'data:image/png;base64,' + img);
					var link = UglifyCSS.processString(tpl);
					fs.readFile(ROOT + path.sep + '.template',function(e,tpl) {
						if (e) util.error(ROOT,'TPL_NOT_FOUND');
						tpl = tpl.toString('utf-8');
						tpl = tpl.replace(/{COLOR}/g, manifest.splashscreen.background);
						tpl = tpl.replace(/{BKCOLOR}/g, manifest.splashscreen.color);
						tpl = tpl.replace(/{TITLE}/g, manifest.title);
						tpl = tpl.replace(/{DESCRIPTION}/g, manifest.description);
						tpl = tpl.replace(/{ICON}/g, 'data:image/png;base64,' + img);
						b64(ROOT + path.sep + "src" + path.sep + 'Contents' + path.sep + 'Resources' + path.sep + 'favicon.ico',function(img) {
							var favicon = "<script>var docHead=document.getElementsByTagName('head')[0];var newLink=document.createElement('link');newLink.rel='shortcut icon';newLink.href='data:image/png;base64," + img + "';docHead.appendChild(newLink);</script>";	
							fs.readFile(__dirname+path.sep+'tpl' + path.sep + 'oa' + path.sep + 'bootstrap_prod.tpl',function(e,launcher) {
								if (e) util.error(ROOT,'TPL_NOT_FOUND');	
								launcher = launcher.toString('utf-8');
								tpl = tpl.replace('</head>', '<style type="text/css">' + link + '</style>');
								tpl = tpl.replace('</body>', favicon + launcher + '</body>');
								var minify = require('html-minifier').minify;
								var min = minify(tpl.replace(/\t/g, '').replace(/\n/g, ''),{
  									removeAttributeQuotes: true
								});
								fs.writeFile(BUILD.www+path.sep+'index.html',min,function() {
									cb();
								});
							})
						});
					});
				});
			});
		}
	};	
	
	res_html_compile();
	
}