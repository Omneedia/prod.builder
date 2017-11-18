module.exports = function(CDN, ROOT, BUILD, manifest, PROJECT_DEV, Settings, cb) {
    var fs = require('fs');
    var path = require('path');
    var Request = global.request;
    var util = require('./util');
    var shortid = require('shortid');

    var result = [];
    var langs = manifest.langs;
    var LANG = [];
    var LANG_RESULT = [];

    LANG.push('i18n_framework={};i18n={};');

    for (var i = 0; i < langs.length; i++) LANG_RESULT.push('i18n["' + langs[i] + '"]={};');

    function addLangs(lang, urls) {
        var result = []
        if (typeof urls === "string") urls = [urls];
        for (var i = 0; i < urls.length; i++) {
            result.push(urls[i].replace(/{lang}/g, lang));
        };
        return result;
    };

    function process_URL(lang, URL, i, cb) {
        if (!URL[i]) return cb(LANG.join('\n'));
        var url = URL[i];
        if (url.indexOf('http') > -1) {
            Request(url, function(e, r, b) {
                if (e) return process_URL(lang, URL, i + 1, cb);
                if (r.statusCode == 404) return process_URL(lang, URL, i + 1, cb);
                var script = b.toString('utf-8');
                if (url.indexOf('json') > -1) {
                    script = "i18n['" + lang + "']=Object.assign(i18n['" + lang + "']," + script + ");"
                    LANG_RESULT.push(script);
                } else LANG.push(script);
                process_URL(lang, URL, i + 1, cb);
            });

        } else {
            fs.readFile(url, function(e, b) {
                if (e) return process_URL(lang, URL, i + 1, cb);
                var script = b.toString('utf-8');
                if (url.indexOf('json') > -1) script = "i18n['" + lang + "']=Object.assign(i18n['" + lang + "']," + script + ");"
                LANG.push(script);
                process_URL(lang, URL, i + 1, cb);
            });
        }
    };

    function process_lang(langs, i, urls, cb) {
        if (!langs[i]) return cb();
        var lang = langs[i];
        var URL = addLangs(lang, urls);
        LANG = [];
        process_URL(lang, URL, 0, function(str) {
            LANG_RESULT.push('i18n_framework["' + lang + '"]=function(){' + str + '};');
            process_lang(langs, i + 1, urls, cb);
        });
    };

    console.log('- Loading i18n');

    var frameworks = manifest.frameworks;
    var urls = [];

    // loaded all frameworks i18n
    for (var i = 0; i < frameworks.length; i++) {
        var framework = frameworks[i];
        var list = [];
        if (framework.i18n) {
            if (typeof framework.i18n === "string") list.push(framework.i18n);
            else list = list.concat(framework.i18n);
            for (var y = 0; y < list.length; y++) {
                var url = list[y];
                for (var el in framework) {
                    if ((el != "src") && (el != "i18n") && (el != "res")) {
                        var replace = '{' + el + '}';
                        var re = new RegExp(replace, "g");
                        url = url.replace(re, framework[el]);
                    }
                };
                for (var el in manifest.paths) {
                    if (url.indexOf(el) > -1) url = manifest.paths[el] + url.split(el)[1];
                };
            };
            urls = urls.concat(url);
        };
    };

    // loaded all modules i18n

    var REQUIRE = [];

    function loadModule(o, i, cb) {
        if (!o[i]) return cb();
        var base = o[i].substr(0, o[i].lastIndexOf('/') + 1);
        Request({
            url: o[i],
            encoding: null
        }, function(err, res, body) {
            if (err) util.error(ROOT, 'MODULE_NOT_FOUND');
            try {
                var z = JSON.parse(body);
                if (z.package) {
                    for (var j = 0; j < z.package.i18n.length; j++) REQUIRE.push(base + z.package.i18n[j]);
                    loadModule(o, i + 1, cb);
                } else util.error(ROOT, 'MODULE_ERROR');
            } catch (e) {
                console.log(e);
                util.error(ROOT, 'MODULE_ERROR');
            }
        });
    };

    urls.push(ROOT + '/src/Contents/Culture/{lang}.js');
    urls.push(ROOT + '/src/Contents/Culture/{lang}.json');


    loadModule(manifest.modules, 0, function() {
        urls = urls.concat(REQUIRE);
        process_lang(langs, 0, urls, function() {
            fs.writeFile(PROJECT_DEV + path.sep + 'i18n.pack', LANG_RESULT.join('\n'), cb);
        });
    });


}