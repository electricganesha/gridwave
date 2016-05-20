/**
 * @author bhouston / http://clara.io
 *
 * For a horizontal blur, use X_STEP 1, Y_STEP 0
 * For a vertical blur, use X_STEP 0, Y_STEP 1
 *
 * For speed, this shader precomputes uv offsets in vert shader to allow for prefetching
 *
 */

THREE.DepthLimitedBlurShader = {

	defines: {

		"KERNEL_RADIUS": 4,
		"DEPTH_PACKING": 1,
		"PERSPECTIVE_CAMERA": 1


	},

	uniforms: {

		"tDiffuse":         { type: "t", value: null },
      "tScreen":         { type: "t", value: null },
		"size":             { type: "v2", value: new THREE.Vector2( 512, 512 ) },
		"sampleUvOffsets":  { type: "v2v", value: [ new THREE.Vector2( 0, 0 ) ] },
		"sampleWeights":    { type: "1fv", value: [ 1.0 ] },
		"cameraNear":       { type: "f", value: 10 },
		"cameraFar":        { type: "f", value: 1000 },
		"depthCutoff":      { type: "f", value: 10 },

	},

	vertexShader: [

		"#include <common>",

		"uniform vec2 size;",

		"varying vec2 vUv;",
		"varying vec2 vInvSize;",

		"void main() {",

			"vUv = uv;",
			"vInvSize = 1.0 / size;",

			"gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );",

		"}"

	].join( "\n" ),

	fragmentShader: [

		"#include <common>",
		"#include <packing>",

		"uniform sampler2D tDiffuse;",
      
		"uniform float cameraNear;",
		"uniform float cameraFar;",
		"uniform float depthCutoff;",

		"uniform vec2 sampleUvOffsets[ KERNEL_RADIUS + 1 ];",
		"uniform float sampleWeights[ KERNEL_RADIUS + 1 ];",

		"varying vec2 vUv;",
		"varying vec2 vInvSize;",
      
        "float UnpackFloatFromRGB(vec3 pack) {",
        "   return dot(pack, vec3(1.0, 1.0 / 255.0, 1.0 / 65025.0));",
        "}",
      
		"vec2 getDepthAO( const in vec2 screenPosition ) {",
        " vec4 texel = texture2D( tDiffuse, screenPosition );",
        "  return vec2(UnpackFloatFromRGB( texel.rgb ),texel.a);",
		"}",

		"float getViewZ( const in float depth ) {",

			"#if PERSPECTIVE_CAMERA == 1",
				"return perspectiveDepthToViewZ( depth, cameraNear, cameraFar );",
			"#else",
				"return orthoDepthToViewZ( depth, cameraNear, cameraFar );",
			"#endif",

		"}",
       
		"void main() {",

			"vec2 depth = getDepthAO( vUv );",
			"if( depth.x >= ( 1.0 - EPSILON ) ) {",
				"discard;",
			"}",

			"float centerViewZ = -getViewZ( depth.x );",
			"bool rBreak = false, lBreak = false;",

			"float weightSum = sampleWeights[0];",
			"float diffuseSum = depth.y * weightSum;",

			"for( int i = 1; i <= KERNEL_RADIUS; i ++ ) {",

				"float sampleWeight = sampleWeights[i];",
				"vec2 sampleUvOffset = sampleUvOffsets[i] * vInvSize;",

				"vec2 sampleUv = vUv + sampleUvOffset;",
                
                "depth = getDepthAO( sampleUv );",
				
                "float viewZ = -getViewZ( depth.x );",

				"if( abs( viewZ - centerViewZ ) > depthCutoff ) rBreak = true;",

				"if( ! rBreak ) {",
					"diffuseSum += depth.y * sampleWeight;",
					"weightSum += sampleWeight;",
				"}",
                
				"sampleUv = vUv - sampleUvOffset;",
                "depth = getDepthAO( sampleUv );",
				"viewZ = -getViewZ( depth.x  );",

				"if( abs( viewZ - centerViewZ ) > depthCutoff ) lBreak = true;",

				"if( ! lBreak ) {",
					"diffuseSum += depth.y * sampleWeight;",
					"weightSum += sampleWeight;",
				"}",

			"}",
            "gl_FragColor = vec4(diffuseSum / weightSum);",
        "}"

	].join( "\n" )

};
