<script>
window.setTimeout(function(){
	var script=document.createElement('script');
	script.src="Contents/Application.js";
	document.getElementsByTagName('body')[0].appendChild(script);
	var res=document.createElement('link');
	res.href="Contents/Resources.css";
	res.rel = 'stylesheet';
	res.type = 'text/css';	
	document.getElementsByTagName('head')[0].appendChild(res);	
},1000);
</script>