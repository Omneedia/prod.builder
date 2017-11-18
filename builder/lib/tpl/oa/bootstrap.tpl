		<script src="http://cdn.omneedia.com/public/requirejs/require.js" type="text/javascript" charset="utf-8"></script>
		<script>
		var bootstraploader=function(tab,i,cb) {
			if (i<=tab.length) Require([tab[i]],function(){
				bootstraploader(tab,i+1,cb);
			}); else cb();
		};
		setTimeout(function(){
			Require(["Contents/Settings"], function() {
				bootstraploader(Settings.FRAMEWORKS,0, function(){
					Require(["Contents/Application/app"], function() {					
						
					});
				});		
			});
		},1000);
		</script>