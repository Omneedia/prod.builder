module.exports = function(cb) {
	var fs = require('fs');
	var path = require('path');
	var util = require('./util');
	
	util.removeRecursive(__dirname+path.sep+".."+path.sep+"var",function() {
		fs.mkdir(__dirname+path.sep+".."+path.sep+"var",function() {
			cb();		
		});
	});	
};