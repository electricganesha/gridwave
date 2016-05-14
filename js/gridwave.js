var GridWave = function(el, config){
    var defaults = {
        segmentsWidth: 10,
        segmentsHeight: 6,
        imagePath: null,
        modelPath:null,
        gridColor: 0xFFFFFF,
        ambientColor: 0xAAAAAA,
        lightColor: 0xAA0000,
        lightRadius: 1.0
    }
    this.el = el;
    for(var d in defaults) this[d] = config[d] ? config[d]:defaults[d];
     
    // THREE
    
    this.renderer = new THREE.WebGLRenderer({antialias:true});
    
    window.addEventListener("resize", this.resize.bind(this));
    this.resize();
    
    this.scene = new THREE.Scene();
    this.imageQuad = new THREE.Mesh( new THREE.PlaneBufferGeometry( 2, 2 ) , null);
    this.scene.add(this.imageQuad);
    
    this.ambient = new THREE.AmbientLight(this.ambientColor);
	this.scene.add(this.ambient);

	this.light = new THREE.PointLight(this.lightColor);
    this.scene.add(this.light);
  
    this.model = this.loadGrid();
}

GridWave.prototype.loadGrid = function(path){
    
}

GridWave.prototype.resize = function(path){
    var w = el.offsetWidth, h = el.offsetHeight;
    this.camera = new THREE.PerspectiveCamera(45,w/h,1,1000);
    
    this.renderer.setSize(w, h);
}


GridWave.prototype.backgroundMaterial = function(path){
    
}

GridWave.prototype.gridMaterial = function(){
    
}

GridWave.prototype.render = function(time){
    if(!this.stop) window.requestAnimationFrame(this.render);
}

GridWave.prototype.start = function(){
    delete this.stop;
    this.render();
}

GridWave.prototype.stop = function(){
    this.stop = true;
}

GridWave.prototype.noiseVertexText = [
"		precision highp float;",
"		uniform float amplitude;",
"		attribute float displacement;",
"		varying vec3 vNormal;",
"		varying vec3 v_viewPosition;",
"		varying vec3 v_position;",
"",
"		vec3 mod289(vec3 x)",
"		{",
"			return x - floor(x * (1.0 / 289.0)) * 289.0;",
"		}",
"",
"		vec4 mod289(vec4 x)",
"		{",
"			return x - floor(x * (1.0 / 289.0)) * 289.0;",
"		}",
"",
"		vec4 permute(vec4 x)",
"		{",
"			return mod289(((x*34.0)+1.0)*x);",
"		}",
"",
"		vec4 taylorInvSqrt(vec4 r)",
"		{",
"			return 1.79284291400159 - 0.85373472095314 * r;",
"		}",
"",
"		vec3 fade(vec3 t) {",
"			return t*t*t*(t*(t*6.0-15.0)+10.0);",
"		}",
"",
"		// Classic Perlin noise",
"		float cnoise(vec3 P)",
"		{",
"			vec3 Pi0 = floor(P); // Integer part for indexing",
"			vec3 Pi1 = Pi0 + vec3(1.0); // Integer part + 1",
"			Pi0 = mod289(Pi0);",
"			Pi1 = mod289(Pi1);",
"			vec3 Pf0 = fract(P); // Fractional part for interpolation",
"			vec3 Pf1 = Pf0 - vec3(1.0); // Fractional part - 1.0",
"			vec4 ix = vec4(Pi0.x, Pi1.x, Pi0.x, Pi1.x);",
"			vec4 iy = vec4(Pi0.yy, Pi1.yy);",
"			vec4 iz0 = Pi0.zzzz;",
"			vec4 iz1 = Pi1.zzzz;",
"",
"			vec4 ixy = permute(permute(ix) + iy);",
"			vec4 ixy0 = permute(ixy + iz0);",
"			vec4 ixy1 = permute(ixy + iz1);",
"",
"			vec4 gx0 = ixy0 * (1.0 / 7.0);",
"			vec4 gy0 = fract(floor(gx0) * (1.0 / 7.0)) - 0.5;",
"			gx0 = fract(gx0);",
"			vec4 gz0 = vec4(0.5) - abs(gx0) - abs(gy0);",
"			vec4 sz0 = step(gz0, vec4(0.0));",
"			gx0 -= sz0 * (step(0.0, gx0) - 0.5);",
"			gy0 -= sz0 * (step(0.0, gy0) - 0.5);",
"",
"			vec4 gx1 = ixy1 * (1.0 / 7.0);",
"			vec4 gy1 = fract(floor(gx1) * (1.0 / 7.0)) - 0.5;",
"			gx1 = fract(gx1);",
"			vec4 gz1 = vec4(0.5) - abs(gx1) - abs(gy1);",
"			vec4 sz1 = step(gz1, vec4(0.0));",
"			gx1 -= sz1 * (step(0.0, gx1) - 0.5);",
"			gy1 -= sz1 * (step(0.0, gy1) - 0.5);",
"",
"			vec3 g000 = vec3(gx0.x,gy0.x,gz0.x);",
"			vec3 g100 = vec3(gx0.y,gy0.y,gz0.y);",
"			vec3 g010 = vec3(gx0.z,gy0.z,gz0.z);",
"			vec3 g110 = vec3(gx0.w,gy0.w,gz0.w);",
"			vec3 g001 = vec3(gx1.x,gy1.x,gz1.x);",
"			vec3 g101 = vec3(gx1.y,gy1.y,gz1.y);",
"			vec3 g011 = vec3(gx1.z,gy1.z,gz1.z);",
"			vec3 g111 = vec3(gx1.w,gy1.w,gz1.w);",
"",
"			vec4 norm0 = taylorInvSqrt(vec4(dot(g000, g000), dot(g010, g010), dot(g100, g100), dot(g110, g110)));",
"			g000 *= norm0.x;",
"			g010 *= norm0.y;",
"			g100 *= norm0.z;",
"			g110 *= norm0.w;",
"			vec4 norm1 = taylorInvSqrt(vec4(dot(g001, g001), dot(g011, g011), dot(g101, g101), dot(g111, g111)));",
"			g001 *= norm1.x;",
"			g011 *= norm1.y;",
"			g101 *= norm1.z;",
"			g111 *= norm1.w;",
"",
"			float n000 = dot(g000, Pf0);",
"			float n100 = dot(g100, vec3(Pf1.x, Pf0.yz));",
"			float n010 = dot(g010, vec3(Pf0.x, Pf1.y, Pf0.z));",
"			float n110 = dot(g110, vec3(Pf1.xy, Pf0.z));",
"			float n001 = dot(g001, vec3(Pf0.xy, Pf1.z));",
"			float n101 = dot(g101, vec3(Pf1.x, Pf0.y, Pf1.z));",
"			float n011 = dot(g011, vec3(Pf0.x, Pf1.yz));",
"			float n111 = dot(g111, Pf1);",
"",
"			vec3 fade_xyz = fade(Pf0);",
"			vec4 n_z = mix(vec4(n000, n100, n010, n110), vec4(n001, n101, n011, n111), fade_xyz.z);",
"			vec2 n_yz = mix(n_z.xy, n_z.zw, fade_xyz.y);",
"			float n_xyz = mix(n_yz.x, n_yz.y, fade_xyz.x);",
"			return 2.2 * n_xyz;",
"		}",
"",
"		// Classic Perlin noise, periodic variant",
"		float pnoise(vec3 P, vec3 rep)",
"		{",
"			vec3 Pi0 = mod(floor(P), rep); // Integer part, modulo period",
"			vec3 Pi1 = mod(Pi0 + vec3(1.0), rep); // Integer part + 1, mod period",
"			Pi0 = mod289(Pi0);",
"			Pi1 = mod289(Pi1);",
"			vec3 Pf0 = fract(P); // Fractional part for interpolation",
"			vec3 Pf1 = Pf0 - vec3(1.0); // Fractional part - 1.0",
"			vec4 ix = vec4(Pi0.x, Pi1.x, Pi0.x, Pi1.x);",
"			vec4 iy = vec4(Pi0.yy, Pi1.yy);",
"			vec4 iz0 = Pi0.zzzz;",
"			vec4 iz1 = Pi1.zzzz;",
"",
"			vec4 ixy = permute(permute(ix) + iy);",
"			vec4 ixy0 = permute(ixy + iz0);",
"			vec4 ixy1 = permute(ixy + iz1);",
"",
"			vec4 gx0 = ixy0 * (1.0 / 7.0);",
"			vec4 gy0 = fract(floor(gx0) * (1.0 / 7.0)) - 0.5;",
"			gx0 = fract(gx0);",
"			vec4 gz0 = vec4(0.5) - abs(gx0) - abs(gy0);",
"			vec4 sz0 = step(gz0, vec4(0.0));",
"			gx0 -= sz0 * (step(0.0, gx0) - 0.5);",
"			gy0 -= sz0 * (step(0.0, gy0) - 0.5);",
"",
"			vec4 gx1 = ixy1 * (1.0 / 7.0);",
"			vec4 gy1 = fract(floor(gx1) * (1.0 / 7.0)) - 0.5;",
"			gx1 = fract(gx1);",
"			vec4 gz1 = vec4(0.5) - abs(gx1) - abs(gy1);",
"			vec4 sz1 = step(gz1, vec4(0.0));",
"			gx1 -= sz1 * (step(0.0, gx1) - 0.5);",
"			gy1 -= sz1 * (step(0.0, gy1) - 0.5);",
"",
"			vec3 g000 = vec3(gx0.x,gy0.x,gz0.x);",
"			vec3 g100 = vec3(gx0.y,gy0.y,gz0.y);",
"			vec3 g010 = vec3(gx0.z,gy0.z,gz0.z);",
"			vec3 g110 = vec3(gx0.w,gy0.w,gz0.w);",
"			vec3 g001 = vec3(gx1.x,gy1.x,gz1.x);",
"			vec3 g101 = vec3(gx1.y,gy1.y,gz1.y);",
"			vec3 g011 = vec3(gx1.z,gy1.z,gz1.z);",
"			vec3 g111 = vec3(gx1.w,gy1.w,gz1.w);",
"",
"			vec4 norm0 = taylorInvSqrt(vec4(dot(g000, g000), dot(g010, g010), dot(g100, g100), dot(g110, g110)));",
"			g000 *= norm0.x;",
"			g010 *= norm0.y;",
"			g100 *= norm0.z;",
"			g110 *= norm0.w;",
"			vec4 norm1 = taylorInvSqrt(vec4(dot(g001, g001), dot(g011, g011), dot(g101, g101), dot(g111, g111)));",
"			g001 *= norm1.x;",
"			g011 *= norm1.y;",
"			g101 *= norm1.z;",
"			g111 *= norm1.w;",
"",
"			float n000 = dot(g000, Pf0);",
"			float n100 = dot(g100, vec3(Pf1.x, Pf0.yz));",
"			float n010 = dot(g010, vec3(Pf0.x, Pf1.y, Pf0.z));",
"			float n110 = dot(g110, vec3(Pf1.xy, Pf0.z));",
"			float n001 = dot(g001, vec3(Pf0.xy, Pf1.z));",
"			float n101 = dot(g101, vec3(Pf1.x, Pf0.y, Pf1.z));",
"			float n011 = dot(g011, vec3(Pf0.x, Pf1.yz));",
"			float n111 = dot(g111, Pf1);",
"",
"			vec3 fade_xyz = fade(Pf0);",
"			vec4 n_z = mix(vec4(n000, n100, n010, n110), vec4(n001, n101, n011, n111), fade_xyz.z);",
"			vec2 n_yz = mix(n_z.xy, n_z.zw, fade_xyz.y);",
"			float n_xyz = mix(n_yz.x, n_yz.y, fade_xyz.x);",
"			return 2.2 * n_xyz;",
"		}",
"",
"		float stripes( float x, float f) {",
"			float PI = 3.14159265358979323846264;",
"			float t = .5 + .5 * sin( f * 2.0 * PI * x);",
"			return t * t - .5;",
"		}",
"",
"		float turbulence( vec3 p ) {",
"			float w = 100.0;",
"			float t = -.5;",
"			for (float f = 1.0 ; f <= 10.0 ; f++ ){",
"				float power = pow( 2.0, f );",
"				t += abs( pnoise( vec3( power * p ), vec3( 10.0, 10.0, 10.0 ) ) / power );",
"			}",
"			return t;",
"		}",
"",
"		uniform float time;",
"		uniform float weight;",
"		uniform float span;",
"		float z_actual;",
"",
"		void main() {",
"",
"			gl_PointSize = 1.0;",
"",
"			vNormal = normal;",
"			vec4 mPosition = modelMatrix * vec4( position, 1.0 );",
"			vec3 nWorld = normalize( mat3( modelMatrix[0].xyz, modelMatrix[1].xyz, modelMatrix[2].xyz ) * normal );",
"",
"			float noise = 10.0 *  -.10 * turbulence( .5 * normal + time );",
"			float displacement = - weight * noise;",
"			displacement += 80.0 * pnoise( 0.9 * position + vec3( 10.0 * time ), vec3( 100.0 ) );",
"",
"			vec3 newPosition = position + normal * vec3(displacement * amplitude);",
"			gl_Position = projectionMatrix *",
"			modelViewMatrix *",
"			vec4(newPosition,1.0);",
"",
"			v_viewPosition = - mPosition.xyz;",
"			v_position = newPosition;",
"",
"		}"
].join("\n");

