module.exports = {
	copyFile: function (source, target, cb) {
		var cbCalled = false;
		var fs = require('fs');
		var rd = fs.createReadStream(source);
		rd.on("error", function (err) {
			done(err);
		});
		var wr = fs.createWriteStream(target);
		wr.on("error", function (err) {
			done(err);
		});
		wr.on("close", function (ex) {
			done();
		});
		rd.pipe(wr);

		function done(err) {
			if (!cbCalled) {
				cb(err);
				cbCalled = true;
			}
		}
	}
	, mkdir: function (path, callback) {
		var fs = require('fs');
		var sep = require('path').sep;
		var p = path.split(sep);
		function domkdir(dir, i, cb, path) {
			if (!dir[i]) return cb();
			if (!path) path = "";
			fs.mkdir(path + sep + dir[i], function () {
				path = path + sep + dir[i];
				domkdir(dir, i + 1, cb, path);
			});
		};
		p.shift();
		domkdir(p, 0, callback);
	}
	, walk: function (dir, done) {
		var fs = require('fs');
		var path = require('path');
		var p = this;
		var results = [];
		fs.readdir(dir, function (err, list) {
			if (err) return done(err);
			var pending = list.length;
			if (!pending) return done(null, results);
			list.forEach(function (file) {
				file = dir + path.sep + file;
				fs.stat(file, function (err, stat) {
					if (stat && stat.isDirectory()) {
						p.walk(file, function (err, res) {
							results = results.concat(res);
							if (!--pending) done(null, results);
						});
					}
					else {
						results.push(file);
						if (!--pending) done(null, results);
					}
				});
			});
		});
	}
	, removeRecursive: function (path, cb) {
		var self = this;
		var fs = require('fs');
		fs.stat(path, function (err, stats) {
			if (err) {
				cb(err, stats);
				return;
			}
			if (stats.isFile()) {
				fs.unlink(path, function (err) {
					if (err) {
						cb(err, null);
					}
					else {
						cb(null, true);
					}
					return;
				});
			}
			else if (stats.isDirectory()) {
				// A folder may contain files
				// We need to delete the files first
				// When all are deleted we could delete the 
				// dir itself
				fs.readdir(path, function (err, files) {
					if (err) {
						cb(err, null);
						return;
					}
					var f_length = files.length;
					var f_delete_index = 0;
					// Check and keep track of deleted files
					// Delete the folder itself when the files are deleted
					var checkStatus = function () {
						// We check the status
						// and count till we r done
						if (f_length === f_delete_index) {
							fs.rmdir(path, function (err) {
								if (err) {
									cb(err, null);
								}
								else {
									cb(null, true);
								}
							});
							return true;
						}
						return false;
					};
					if (!checkStatus()) {
						for (var i = 0; i < f_length; i++) {
							// Create a local scope for filePath
							// Not really needed, but just good practice
							// (as strings arn't passed by reference)
							(function () {
								var filePath = path + '/' + files[i];
								// Add a named function as callback
								// just to enlighten debugging
								self.removeRecursive(filePath, function removeRecursiveCB(err, status) {
									if (!err) {
										f_delete_index++;
										checkStatus();
									}
									else {
										cb(err, null);
										return;
									}
								});
							})()
						}
					}
				});
			}
		});
	}
	, error: function (ROOT, message) {
		var shelljs = require('shelljs');
		var chalk = require('chalk');
		shelljs.rm('-r', ROOT);
		shelljs.rm('-r', ROOT + '.app');
		console.log(chalk.red.bold('\n!!! ' + message + '\n'));
		process.exit();
	}
}