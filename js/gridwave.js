var GridWave = function(el, config){
    var defaults = {
      imagePath: null,
      modelPath:null,
      modelColor: 0x3F3F3F,
      ambientColor: 0x333333,
      dirColor: 0x333333,
      lightColor: 0xFFFFFF,
      lightIntensity: 3.2,
      lightDistance: 36.0,
      lightElevation: 16,
      cameraElevation: 20,
      scaleX:1,
      scaleY:1,
      alphaDistance:12,
      alphaLower:10,
      alphaExponent:4,
      geoFactorWidth:1.0,
      geoFactorHeight:5.0,
      geoFactorDepth:10.0,
      geoMovementVelocity:0.3,
      enableAO: 0.5
    }
    this.el = el;
    if(config)
      for(var d in defaults)
        this[d] = config[d] ? config[d]:defaults[d];

    // THREE
    this.el.style.backgroundImage = "url("+this.imagePath+")";
    
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.el.addEventListener("mousemove", this.mousemove.bind(this));

    this.renderer = new THREE.WebGLRenderer({antialias:true, alpha: true, premultipliedAlpha:false });
    this.renderer.setPixelRatio( window.devicePixelRatio );
    this.width = this.el.offsetWidth;
    this.height = this.el.offsetHeight;
    this.camera = new THREE.PerspectiveCamera(45,this.width/this.height,1,500);
    this.renderer.setSize(this.width, this.height);
    this.camera.position.z = this.cameraElevation;
    this.scene = new THREE.Scene();

    this.dirLight = new THREE.DirectionalLight(this.dirColor,0.66);
    this.dirLight.position.z = 2*this.cameraElevation;
    this.scene.add(this.dirLight);

    this.ambient = new THREE.AmbientLight(this.ambientColor);
    this.scene.add(this.ambient);

	this.light = new THREE.PointLight(this.lightColor,this.lightIntensity,this.lightDistance,2);
    this.light.position.z = this.lightElevation;
    this.scene.add(this.light);
    var self=this;
    if(this.enableAO){  
      this.aoSetup();
    }
    var modelPromise = this.loadModel(this.modelPath).then(function(geometry){
      self.mesh = new THREE.Mesh(geometry, self.getMaterial());
      self.mesh.scale.set(self.scaleX,self.scaleY,1);
      self.scene.add(self.mesh);
      self.camera.lookAt(self.mesh.position);
      self.dirLight.lookAt(self.mesh.position);
	  self.mesh.geometry.computeBoundingBox();
      if(self.enableAO){ 
        self.mesh.material.uniforms.aoMap.value = self.saoRenderTarget;
        self.mesh.material.uniforms.aoMapIntensity.value = self.enableAO;
      }
    });
  
   this.el.appendChild( this.renderer.domElement );
}

GridWave.prototype.loadModel = function(path){
    return new Promise(function(resolve,reject){
      var ld = new THREE.JSONLoader();
      var geometry;

      ld.load( path, function( geometry,material ) {
        console.log(geometry);
        resolve(geometry);
      });
    });

}

GridWave.prototype.resize = function(path){

}

GridWave.prototype.aoSetup = function(){
  var params = {
      output: 0,
      saoBias: 0.5,
      saoIntensity: 0.25,
      saoScale: 1,
      saoKernelRadius: 100,
      saoMinResolution: 0,
      saoBlur: true,
      saoBlurRadius: 12,
      saoBlurStdDev: 6,
      saoBlurDepthCutoff: 0.01
  }
  this.passCamera = new THREE.OrthographicCamera( -1, 1, 1, -1, 0, 1 );
  this.passQuad = new THREE.Mesh( new THREE.PlaneBufferGeometry( 2, 2 ), new THREE.MeshBasicMaterial() );
  this.passScene = new THREE.Scene();
  this.passScene.add( this.passQuad );
  
  this.saoRenderTarget = new THREE.WebGLRenderTarget( this.width, this.height,
					{ minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, format: THREE.RGBAFormat } );
  this.blurIntermediateRenderTarget = new THREE.WebGLRenderTarget( this.width, this.height,
					{ minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, format: THREE.RGBAFormat } );
  this.depthRenderTarget = new THREE.WebGLRenderTarget( this.width, this.height,
					{ minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, format: THREE.RGBAFormat } );
  this.depthMaterial = this.getMaterial(true);
  this.depthMaterial.blending = THREE.NoBlending;
  
  var saoMaterial = new THREE.ShaderMaterial( THREE.SAOShader );
  saoMaterial.defines[ 'MODE' ] = 2;
  saoMaterial.uniforms[ "tDepth" ].value =  this.depthRenderTarget;
  saoMaterial.uniforms[ 'size' ].value.set( this.width, this.height );
  saoMaterial.uniforms[ 'cameraNear' ].value = this.camera.near;
  saoMaterial.uniforms[ 'cameraFar' ].value = this.camera.far;
  saoMaterial.uniforms[ 'cameraInverseProjectionMatrix' ].value.getInverse( this.camera.projectionMatrix );
  saoMaterial.uniforms[ 'cameraProjectionMatrix' ].value = this.camera.projectionMatrix;
  saoMaterial.blending = THREE.NoBlending;
  this.saoMaterial = saoMaterial;
  
  this.vBlurMaterial = new THREE.ShaderMaterial( THREE.DepthLimitedBlurShader );
  THREE.BlurShaderUtils.configure( this.vBlurMaterial, 12, 6, new THREE.Vector2( 0, 1 ) );
  this.vBlurMaterial.uniforms[ 'size' ].value.set( this.width, this.height );
  this.vBlurMaterial.blending = THREE.NoBlending;
  
  this.hBlurMaterial = new THREE.ShaderMaterial( THREE.DepthLimitedBlurShader );
  THREE.BlurShaderUtils.configure( this.hBlurMaterial, 12, 6, new THREE.Vector2( 1, 0 ) );
  this.hBlurMaterial.uniforms[ 'size' ].value.set( this.width, this.height );
  this.hBlurMaterial.blending = THREE.NoBlending;
  
  
				
}

GridWave.prototype.aoPass = function(renderTarget){
  
  this.scene.overrideMaterial = this.depthMaterial;
  this.renderer.render(this.scene,this.camera, this.depthRenderTarget);
  this.scene.overrideMaterial = null;
  
  
  this.passQuad.material = this.saoMaterial;
  this.renderer.render(this.passScene,this.passCamera, this.saoRenderTarget);
  
 
  this.passQuad.material = this.vBlurMaterial;
  this.vBlurMaterial.uniforms[ "tDiffuse" ].value = this.saoRenderTarget;
  this.renderer.render(this.passScene,this.passCamera, this.blurIntermediateRenderTarget);
  this.passQuad.material = this.hBlurMaterial;
  this.hBlurMaterial.uniforms[ "tDiffuse" ].value = this.blurIntermediateRenderTarget;
  this.renderer.render(this.passScene,this.passCamera, this.saoRenderTarget);
  
}
GridWave.prototype.mousemove = function(event){
    this.mouse.x = ( event.offsetX / this.width ) * 2 - 1;
	this.mouse.y = - ( event.offsetY / this.height ) * 2 + 1;
}

GridWave.prototype.getMaterial = function(depth){
  var defines = depth ? {"DEPTH_PACKING":THREE.RGBADepthPacking}:{};
  if(this.enableAO) defines["USE_AOMAP"]=1;
  return new THREE.ShaderMaterial({
    defines:defines,
    uniforms: THREE.UniformsUtils.merge( [
        THREE.UniformsLib[ 'common' ],
        THREE.UniformsLib[ 'aomap' ],
        THREE.UniformsLib[ 'lightmap' ],
        THREE.UniformsLib[ 'emissivemap' ],
        THREE.UniformsLib[ 'bumpmap' ],
        THREE.UniformsLib[ 'normalmap' ],
        THREE.UniformsLib[ 'displacementmap' ],
        THREE.UniformsLib[ 'roughnessmap' ],
        THREE.UniformsLib[ 'metalnessmap' ],
        THREE.UniformsLib[ 'fog' ],
        THREE.UniformsLib[ 'lights' ],

        {
            "emissive" : { type: "c", value: new THREE.Color( 0x000000 ) },
            "roughness": { type: "1f", value: 0.5 },
            "metalness": { type: "1f", value: 0.2 },
            "envMapIntensity" : { type: "1f", value: 1 },
            "time": { type:"1f", value: 0},
            "alphaDistance" : { type: "1f", value: this.alphaDistance},
            "alphaLower" : { type: "1f", value: this.alphaLower},
            "alphaExponent" : { type: "1f", value: this.alphaExponent},
            "geoFactorWidth": { type:"1f", value: this.geoFactorWidth},
            "geoFactorHeight": { type:"1f", value: this.geoFactorHeight},
            "geoFactorDepth": { type:"1f", value: this.geoFactorDepth},
            "geoMovementVelocity": { type:"1f", value: this.geoMovementVelocity},
            "resolution": {type: "v2", value:new THREE.Vector2(0)}
        }

    ] ),

    vertexShader: this.vertexShaderText,
    fragmentShader: depth ? THREE.ShaderChunk[ 'depth_frag' ]:this.fragmentShaderText,
    transparent: true,
    lights: true
  })
}

GridWave.prototype.render = function(time){
    window.requestAnimationFrame(this.render.bind(this));

    if(this.mesh){
      this.raycaster.setFromCamera( this.mouse, this.camera );
      var intersects = this.raycaster.intersectObjects( [this.mesh] );
      
      for ( var i = 0; i < intersects.length; i++ ) {
          var p = intersects[ i ].point;

          this.light.position.x = p.x * 1.2;
          this.light.position.y = p.y * 1.2;
      }
      this.mesh.material.uniforms.time.value = time/2000;
      this.mesh.material.uniforms.resolution.value.set(this.width,this.height);
      if(this.enableAO){
        this.depthMaterial.uniforms.time.value = time/2000;
        this.aoPass();  
      }
    }
    this.renderer.render(this.scene,this.camera);
    
}

GridWave.prototype.start = function(){
    this.render();
}

GridWave.prototype.stop = function(){
    this.stop = true;
}
GridWave.prototype.vertexShaderText = [
  "#define PHYSICAL",
  "varying vec3 vViewPosition;",
  "#ifndef FLAT_SHADED",
  "	varying vec3 vNormal;",
  "#endif",
  "#include <common>",
  "#include <uv_pars_vertex>",
  "#include <uv2_pars_vertex>",
  "#include <displacementmap_pars_vertex>",
  "#include <color_pars_vertex>",
  "#include <morphtarget_pars_vertex>",
  "#include <skinning_pars_vertex>",
  "#include <shadowmap_pars_vertex>",
  "#include <specularmap_pars_fragment>",
  "#include <logdepthbuf_pars_vertex>",
  "#include <clipping_planes_pars_vertex>",
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
"		uniform float geoFactorWidth;",
"		uniform float geoFactorHeight;",
"		uniform float geoFactorDepth;",
"		uniform float geoMovementVelocity;",

  "void main() {",
  " ",
  "	#include <uv_vertex>",
  "	#include <uv2_vertex>",
  "	#include <color_vertex>",
  "	#include <beginnormal_vertex>",
  "	#include <morphnormal_vertex>",
  "	#include <skinbase_vertex>",
  "	#include <skinnormal_vertex>",
  "	#include <defaultnormal_vertex>",
  "#ifndef FLAT_SHADED",
  "	vNormal = normalize( transformedNormal );",
  "#endif",
  "	#include <begin_vertex>",
  "	#include <displacementmap_vertex>",
  " float displacement =  pnoise(  position + vec3( geoMovementVelocity * time ), vec3( 1.0,1.0,2.0 ));",
  " transformed += vec3(geoFactorWidth,geoFactorHeight,geoFactorDepth) * displacement;",
  "	#include <morphtarget_vertex>",
  "	#include <skinning_vertex>",
  "	#include <project_vertex>",
  "	#include <logdepthbuf_vertex>",
  "	#include <clipping_planes_vertex>",
  "	vViewPosition = - mvPosition.xyz;",
  "	#include <worldpos_vertex>",
  "	#include <shadowmap_vertex>",
  "}"
].join("\n");

GridWave.prototype.fragmentShaderText = [
"#define PHYSICAL",
"",
"uniform vec3 diffuse;",
"uniform vec3 emissive;",
"uniform float roughness;",
"uniform float metalness;",
"uniform float opacity;",
"uniform float alphaDistance;",
"uniform float alphaLower;",
"uniform float alphaExponent;",
"uniform vec2 resolution;",
"",
"uniform float envMapIntensity; // temporary",
"",
"varying vec3 vViewPosition;",
"",
"#ifndef FLAT_SHADED",
"",
"	varying vec3 vNormal;",
"",
"#endif",
"",
"#include <common>",
"#include <packing>",
"#include <color_pars_fragment>",
"#include <uv_pars_fragment>",
"#include <uv2_pars_fragment>",
"#include <map_pars_fragment>",
"#include <alphamap_pars_fragment>",
"#include <aomap_pars_fragment>",
"#include <lightmap_pars_fragment>",
"#include <emissivemap_pars_fragment>",
"#include <envmap_pars_fragment>",
"#include <fog_pars_fragment>",
"#include <bsdfs>",
"#include <cube_uv_reflection_fragment>",
"#include <lights_pars>",
"#include <lights_physical_pars_fragment>",
"#include <shadowmap_pars_fragment>",
"#include <bumpmap_pars_fragment>",
"#include <normalmap_pars_fragment>",
"#include <roughnessmap_pars_fragment>",
"#include <metalnessmap_pars_fragment>",
"#include <logdepthbuf_pars_fragment>",
"#include <clipping_planes_pars_fragment>",
"",
"void main() {",
"",
"	#include <clipping_planes_fragment>",
"",
"	vec4 diffuseColor = vec4( diffuse, opacity );",
"	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );",
"	vec3 totalEmissiveRadiance = emissive;",
"",
"	#include <logdepthbuf_fragment>",
"	#include <map_fragment>",
"	#include <color_fragment>",
"	#include <alphamap_fragment>",
"	#include <alphatest_fragment>",
"	#include <specularmap_fragment>",
"	#include <roughnessmap_fragment>",
"	#include <metalnessmap_fragment>",
"	#include <normal_fragment>",
"	#include <emissivemap_fragment>",
"",
"	// accumulation",
"	#include <lights_physical_fragment>",
"	#include <lights_template>",
"   float adist= distance(geometry.position,pointLights[0].position - vec3(0.0,0.0,alphaLower));",
"   diffuseColor.a =  pow(smoothstep(0.0,alphaDistance,adist),alphaExponent);",
"	// modulation",
"#ifdef USE_AOMAP",
"	float ambientOcclusion = ( texture2D( aoMap, gl_FragCoord.xy/resolution ).r - 1.0 ) * aoMapIntensity + 1.0;",
"	reflectedLight.indirectDiffuse *= ambientOcclusion;",
//"	reflectedLight.directDiffuse *= pow(ambientOcclusion,2.0);",
//"   float dotNV = saturate( dot( geometry.normal, geometry.viewDir ) );",
//"   reflectedLight.directSpecular *= computeSpecularOcclusion( dotNV, ambientOcclusion, material.specularRoughness );",
"#endif",
"",
"	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + reflectedLight.directSpecular + reflectedLight.indirectSpecular + totalEmissiveRadiance;",
"",
"	gl_FragColor = vec4( outgoingLight, diffuseColor.a );",
"",
"	#include <premultiplied_alpha_fragment>",
"	#include <tonemapping_fragment>",
"	#include <encodings_fragment>",
"	#include <fog_fragment>",
//"gl_FragColor = vec4(vec3(ambientOcclusion),1.0);",
"}"
].join("\n");

THREE.BlurShaderUtils = {

	createSampleWeights: function( kernelRadius, stdDev ) {

		var gaussian = function( x, stdDev ) {
			return Math.exp( - ( x*x ) / ( 2.0 * ( stdDev * stdDev ) ) ) / ( Math.sqrt( 2.0 * Math.PI ) * stdDev );
		};

		var weights = [];

		for( var i = 0; i <= kernelRadius; i ++ ) {
			weights.push( gaussian( i, stdDev ) );
		}

		return weights;
	},

	createSampleOffsets: function( kernelRadius, uvIncrement ) {

		var offsets = [];

		for( var i = 0; i <= kernelRadius; i ++ ) {
			offsets.push( uvIncrement.clone().multiplyScalar( i ) );
		}

		return offsets;

	},

	configure: function( material, kernelRadius, stdDev, uvIncrement ) {

		material.defines[ 'KERNEL_RADIUS' ] = kernelRadius;
		material.uniforms[ 'sampleUvOffsets' ].value = THREE.BlurShaderUtils.createSampleOffsets( kernelRadius, uvIncrement );
		material.uniforms[ 'sampleWeights' ].value = THREE.BlurShaderUtils.createSampleWeights( kernelRadius, stdDev );
		material.needsUpdate = true;

	}

};