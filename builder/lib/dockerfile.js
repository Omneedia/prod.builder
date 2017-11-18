module.exports = function(CDN,ROOT,BUILD,Manifest,cb) {
	var fs = require('fs');
	var path = require('path');
	var Request = global.request;
	var shortid = require('shortid');
	
	var util = require('./util');
	
	var DOCKERFILE=[
		"FROM omneedia/prod:latest",
	];	
	var paths=[];
	
	console.log('- Processing Dockerfile');
	
	function docker_add(files,i,cb) {
		if (!files[i]) return cb();
		if (files[i].indexOf('registry.json')==-1) {
			var file=files[i].substr(BUILD.base.length,files[i].length);
			file="/opt/"+Manifest.namespace+file;
			var path=file.substr(0,file.lastIndexOf('/'));
			if (paths.indexOf(path)==-1) {
				//DOCKERFILE.push('RUN mkdir -p '+path);
				if (paths.indexOf(path)==-1) paths.push(path);
			};
			//DOCKERFILE.push('ADD '+files[i].substr(BUILD.base.length+1,files[i].length)+' '+file);
			docker_add(files,i+1,cb);
		} else docker_add(files,i+1,cb);
	};
	var aptget=[];

	if (Manifest.apt) {
		for (var i=0;i<Manifest.apt.length;i++) {	
			aptget.push(Manifest.apt[i]);
		}
	};
	DOCKERFILE.push('RUN apt-get install -y '+aptget.join(' '));
	
	//DOCKERFILE.push('RUN ln -s `which nodejs` /usr/bin/node');
	
	// making work directory
	DOCKERFILE.push('RUN mkdir -p /opt/'+Manifest.namespace);
	for (var el in BUILD) {
		if (el=='base') {
			if (paths.indexOf('/opt/'+Manifest.namespace+'/Contents')==-1) paths.push('/opt/'+Manifest.namespace+'/Contents');
		} else {
			if (paths.indexOf('/opt/'+Manifest.namespace+'/Contents/'+el)==-1) paths.push('/opt/'+Manifest.namespace+'/Contents/'+el);
		}
	};
	
	DOCKERFILE.push('RUN mkdir -p '+paths.join(' '));	
	
	DOCKERFILE.push('ENV PATH "$PATH:/opt/'+Manifest.namespace+'/Contents"');
	DOCKERFILE.push('ENV port 3000');

	// reading BUILD Directory
	util.walk(BUILD.base,function(e,files) {
		docker_add(files,0,function() {	
			DOCKERFILE.push("COPY Contents/. /opt/"+Manifest.namespace+"/Contents");
			DOCKERFILE.push("WORKDIR /opt/"+Manifest.namespace+"/Contents");
			DOCKERFILE.push("RUN npm install");
			//DOCKERFILE.push("EXPOSE 3000");
			DOCKERFILE.push('CMD ["node", "worker"]');
			fs.writeFile(BUILD.base+path.sep+'Dockerfile',DOCKERFILE.join('\n'),cb);
		});
	});
	
}