module.exports = function(CDN, ROOT, BUILD, manifest, PROJECT_DEV, Settings, cb) {
    var fs = require('fs');
    var path = require('path');
    var IM = require('imagemagick');
    var UglifyCSS = require("uglifycss");
    var Request = global.request;
    var util = require('./util');
    var shortid = require('shortid');
    var IM = require('jimp');

    var result = [];
    var CSS = [];

    console.log('- Building resources');

    var resources = [];

    function getMIME(filename) {
        if (filename.indexOf('.gif') > -1) return "image/gif";
        if (filename.indexOf('.jpg') > -1) return "image/jpeg";
        if (filename.indexOf('.png') > -1) return "image/png";
    };

    function convert(GP, i, cb) {
        if (!GP[i]) return cb();
        var cmd = [
            GP[i].in
        ];
        var args = GP[i].cmd.split(' ');
        for (var z = 0; z < args.length; z++) cmd.push(args[z]);
        cmd.push(GP[i].out);
        IM.convert(cmd, function() {
            convert(GP, i + 1, cb);
        });
    };

    function createAssets(o, i, cb) {
        if (!o[i]) return cb();
        var img = o[i];
        var src = ROOT + "/" + img.src;
        var dest = ROOT + "/src/" + img.dest;
        if (img.transform.resize) {
            var values = img.transform.resize.split(',');
            IM.read(src, function(err, img) {
                img.resize(values[0] * 1, values[1] * 1).write(dest);
                createAssets(o, i + 1, cb);
            });
        }
    };

    function loadBase64Image(o, i, cb, arr) {
        if (!arr) var arr = [];
        if (!o[i]) return cb(arr);
        if (o[i] == '-1') {
            arr.push('-1');
            loadBase64Image(o, i + 1, cb, arr);
            return;
        };
        console.log('	[' + i + '/' + o.length + '] adding asset (' + path.basename(o[i]) + ')');
        if (o[i].indexOf('http') == -1) {
            fs.readFile(ROOT + path.sep + 'src' + path.sep + o[i], function(e, body) {
                if (body) {
                    var base64prefix = 'data:' + getMIME(o[i]) + ';base64,',
                        image = body.toString('base64');
                    arr.push(base64prefix + image);
                } else {
                    var str = "	! NOT FOUND: " + o[i];
                    arr.push("");
                };
                loadBase64Image(o, i + 1, cb, arr);
            });
        } else {
            Request({
                url: o[i],
                encoding: null,
                gzip: true
            }, function(err, res, body) {
                if (!err && res.statusCode == 200) {
                    // So as encoding set to null then request body became Buffer object
                    var base64prefix = 'data:' + res.headers['content-type'] + ';base64,',
                        image = body.toString('base64');
                    arr.push(base64prefix + image);
                } else {
                    var str = "	! NOT FOUND: " + o[i];
                    //console.log(str);
                    arr.push("");
                }
                loadBase64Image(o, i + 1, cb, arr);
            });
        }
    };

    function compileCSS(body, cb, url) {
        console.log('	- processing ' + url);
        // remote content
        var durl = url.lastIndexOf('/');
        durl = url.substr(0, durl);
        var result = body.split('url(');
        var o = [];
        o[0] = "-1";
        for (var i = 1; i < result.length; i++) {
            var tt = result[i].indexOf(')');
            var test = result[i].substr(0, tt);
            var type = test.lastIndexOf('.');
            var type = test.substr(type + 1, test.length).toLowerCase();
            if ((type == "gif") || (type == "jpg") || (type == "png")) {
                o.push(durl + '/' + test);
            } else o.push("-1");
        };
        loadBase64Image(o, 0, function(r) {
            for (var i = 0; i < r.length; i++) {
                var element = r[i];
                if (element != -1) {
                    var tt = result[i].indexOf(')');
                    result[i] = element + result[i].substr(tt, result[i].length);
                }
            };
            result = result.join('url(');
            CSS.push(result);
            cb();
        });

    };

    function getCSS(i, cb) {
        if (!resources[i]) return cb();
        if (resources[i].indexOf('http') > -1) {
            var cpt = 1;
            // remote CSS
            Request({
                url: resources[i],
                encoding: null
            }, function(err, res, body) {
                if (err) util.error(ROOT, 'REMOTE_CSS_NOT_FOUND');
                var body = body.toString('utf-8');
                var bbody = body.split('\n');
                var newbody = [];
                for (var j = 0; j < bbody.length; j++) {
                    if (bbody[j].indexOf('@import') > -1) {
                        resources.splice(i + cpt, 0, resources[i].substr(0, resources[i].lastIndexOf('/') + 1) + bbody[j].split("'")[1]);
                        cpt++;
                    } else newbody.push(bbody[j]);
                };
                compileCSS(newbody.join('\n'), function() {
                    getCSS(i + 1, cb);
                }, resources[i]);
            })
        } else {
            // local CSS
            fs.readFile(ROOT + path.sep + 'src' + path.sep + resources[i], function(e, r) {
                if (e) util.error(ROOT, ROOT + path.sep + 'src' + path.sep + resources[i] + ' LOCAL_CSS_NOT_FOUND');
                compileCSS(r.toString('utf-8'), function() {
                    getCSS(i + 1, cb);
                }, resources[i]);
            });
        }
    };


    function loadModule(o, i, cb) {
        if (!o[i]) return cb();
        var url = "";
        for (var el in manifest.paths) {
            if (o[i].split(el).length > 1) {
                url = o[i].replace(el, manifest.paths[el]);
                var _url = url.substr(url.lastIndexOf('/') + 1, url.length);
                _url = _url.replace(/\./g, '/');
                url = url.substr(0, url.lastIndexOf('/')) + '/' + _url + '.json';
            };
        };
        var base = url.split('.json')[0] + '/';
        if (url.indexOf('http') > -1) {
            Request({
                url: url,
                encoding: null
            }, function(err, res, body) {
                if (err) util.error(ROOT, 'MODULE_NOT_FOUND');
                try {
                    var z = JSON.parse(body);
                } catch (e) {
                    util.error(ROOT, 'MODULE_ERROR');
                };
                if (z.package) {
                    for (var j = 0; j < z.package.css.length; j++) {
                        var zi = base + z.package.css[j];
                        for (var el in z) {
                            if ((el != "repositories") && (el != "package")) {
                                var replace = '{' + el + '}';
                                var re = new RegExp(replace, "g");
                                zi = zi.replace(re, z[el]);
                            };
                        };
                        resources.push(zi);
                    };
                    loadModule(o, i + 1, cb);
                } else util.error(ROOT, 'MODULE_ERROR');
            });
        } else {

        }
    };

    fs.readFile(ROOT + path.sep + 'app.manifest', function(e, manifest) {
        if (e) util.error('MANIFEST_NOT_FOUND');
        manifest = manifest.toString('utf-8');
        try {
            manifest = JSON.parse(manifest);
        } catch (e) {
            util.error('MANIFEST_NOT_READABLE');
        };
        for (var i = 0; i < manifest.frameworks.length; i++) {
            var m = manifest.frameworks[i];
            if (m.res) {
                if (m.res.constructor === Array) {
                    for (var zz = 0; zz < m.res.length; zz++) {
                        for (var el in m) {
                            if ((el != "src") && (el != "i18n") && (el != "res")) {
                                var replace = '{' + el + '}';
                                var re = new RegExp(replace, "g");
                                m.res[zz] = m.res[zz].replace(re, m[el]);
                            }
                        };
                        resources.push(m.res[zz]);
                    }
                } else {
                    for (var el in m) {
                        if ((el != "src") && (el != "i18n") && (el != "res")) {
                            var replace = '{' + el + '}';
                            var re = new RegExp(replace, "g");
                            m.res = m.res.replace(re, m[el]);
                        }
                    };
                    resources.push(m.res);
                }
            };
        };

        for (var i = 0; i < resources.length; i++) {
            var res = resources[i];
            for (var el in manifest.paths) {
                if (el.indexOf('@') > -1) {
                    var replace = el;
                    var re = new RegExp(replace, "g");
                    res = res.replace(re, manifest.paths[el]);
                };
            };
            resources[i] = res;
        };

        fs.readFile(ROOT + path.sep + '.template.config', function(e, b) {
            eval(b.toString('utf-8'));
            createAssets(conf.assets, 0, function() {
                loadModule(manifest.modules, 0, function() {
                    getCSS(0, function() {
                        console.log('- Bundle Resources');
                        CSS = UglifyCSS.processString(CSS.join('\n'));
                        fs.writeFile(BUILD.www + path.sep + 'Contents' + path.sep + 'Resources.css', CSS, cb);
                    });
                });
            });
        });

    });

}