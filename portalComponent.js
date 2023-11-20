import * as THREE from 'three';
import * as CameraUtils from 'three/addons/utils/CameraUtils.js'; 
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export function portalRendering(){
    const screenSizeX = 1280;
    const screenSizeY = 720;

    const pixelTextureSizeX = 512;
    const pixelTextureSizeY = 512;

    let portalList = []; //for the list of portals in the scene to loop over and render

    //globals needed for portal calculations
    let reflectedPosition, bottomLeftCorner, bottomRightCorner, topLeftCorner

    const bufferScene = new THREE.Scene();//for pixel shader fullscreen quad

    // Set up main scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color( 0x443333 );

    const renderer = new THREE.WebGLRenderer();
    renderer.setSize(1280, 720);
    document.body.appendChild(renderer.domElement);

    //main camera for rendering
    const camera = new THREE.PerspectiveCamera(75, screenSizeX / screenSizeY, 0.1, 1000);
    camera.position.set( 0, 2, 20 );
    //orbital controls
    const controls = new OrbitControls( camera, renderer.domElement );

    //camera for the full screen quad pixel shader
    const pixelShaderCamera = new THREE.PerspectiveCamera(75, pixelTextureSizeX / pixelTextureSizeY, 0.1, 1000);

    //framebuffer for the rendered pixelshader
    var  bufferTexture = new THREE.WebGLRenderTarget(pixelTextureSizeX, pixelTextureSizeY, { minFilter: THREE.LinearFilter, magFilter: THREE.NearestFilter})

    var uniforms = {
        texture1: {type: 't', value: bufferTexture},
        iTime: {value: 1.0},
        iFrame: {value: 1.0},
    };

    const shaderMaterial = new THREE.ShaderMaterial( {
        uniforms: uniforms,
        vertexShader: `
        void main() {
            gl_Position = vec4( position, 1.0 );

        }`,
        fragmentShader: `uniform float iTime;
            vec3 palette( float t ) {
                vec3 a = vec3(0.5, 0.5, 0.5);
                vec3 b = vec3(0.5, 0.5, 0.5);
                vec3 c = vec3(1.0, 1.0, 1.0);
                vec3 d = vec3(0.263,0.416,0.557);

                return a + b*cos( 6.28318*(c*t+d) );
            }

            float roundToDecimal(float value, float multiplier) {
                return round(value * multiplier) / multiplier;
            }


            void main(){
                vec2 uv = (gl_FragCoord.xy * 2.0 - vec2(512.0, 512.0)) / 512.0;
                vec2 center = vec2(roundToDecimal(uv.x, 10.), roundToDecimal(uv.y, 10.));
                float len = 1. - length(center - uv);
                float d = length(center);
                float index = (d + iTime / 2.);
                vec3 col = palette(index);
                col *= len;
                gl_FragColor = vec4(col, 1.0);
        }`,
        depthTest: true,
        transparent: false
    } );

    const glowMaterial = new THREE.ShaderMaterial({
        uniforms: {
        iTime: { value: 1.0 },
        },
        vertexShader: `
        varying vec3 vNormal;
        void main() {
            vNormal = normalize(normalMatrix * normal);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
        `,
        fragmentShader: `
        varying vec3 vNormal;

        uniform float iTime;

        vec3 palette(float t) {
            vec3 a = vec3(0.5, 0.5, 0.5);
            vec3 b = vec3(0.5, 0.5, 0.5);
            vec3 c = vec3(1.0, 1.0, 1.0);
            vec3 d = vec3(0.263, 0.416, 0.557);
            return a + b*cos(6.28318*(c*t+d));
        }

        void main() {

            vec2 uv = (gl_FragCoord.xy * 2.0 - vec2(512.0, 512.0)) / 512.0;  
            vec2 uv0 = uv;
            
            vec3 finalColor = vec3(0.0);
        
            for (float i = 0.0; i < 4.0; i++) {
        
                uv = fract(uv * 1.5) - 0.5;
            
                float d = length(uv) * exp(-length(uv0));
                vec3 col = palette(length(uv0) + iTime / 4.0);
            
                d = sin(d*8.0 + iTime*(0.9+i/4.0))/8.0;
                d = abs(d);
                d = pow(0.02 / d, 1.8);
            
                finalColor += col * d;
            
            }

            // Output to screen
            gl_FragColor = vec4(finalColor,1.0);
        }
        `,
    });


    const planeGeo = new THREE.PlaneGeometry( 10, 10);
    const spheregeometry = new THREE.SphereGeometry( 2, 32, 16 ); 
    const spherematerial = new THREE.MeshBasicMaterial( { color: 0xffff00 } ); 


    const frontBox = createBoxPortalMesh([0, 65, 0], [0,2,0], 10);
    scene.add(frontBox.mesh);
    scene.add(frontBox.portals[0])
    scene.add(frontBox.portals[1])
    scene.add(frontBox.light)

    portalList.push(frontBox)

    const rightBox = createBoxPortalMesh([0, -65, 0], [0,2,0], 10)
    scene.add(rightBox.mesh)
    scene.add(rightBox.portals[0])
    rightBox.portals[1].rotateY(Math.PI/2)
    rightBox.portals[1].position.x = 5;
    rightBox.portals[1].position.z = 0;
    scene.add(rightBox.portals[1])
    scene.add(rightBox.light)

    portalList.push(rightBox)

    const leftBox = createBoxPortalMesh([0, -85, 0], [0,2,0], 10)
    scene.add(leftBox.mesh)
    scene.add(leftBox.portals[0])
    leftBox.portals[1].rotateY(-Math.PI/2)
    leftBox.portals[1].position.x = -5;
    leftBox.portals[1].position.z = 0;
    scene.add(leftBox.portals[1])
    scene.add(leftBox.light)

    portalList.push(leftBox)


    bottomLeftCorner = new THREE.Vector3();
    bottomRightCorner = new THREE.Vector3();
    topLeftCorner = new THREE.Vector3();
    reflectedPosition = new THREE.Vector3();    


    //begin pixel shader geometry
    const fs_geometry = new THREE.BufferGeometry();
    // Triangle expressed in clip space coordinates
    // extending clip space creates full screen quad
    const vertices = new Float32Array([
        -1.0, -1.0,
        3.0, -1.0,
        -1.0, 3.0
    ]);

    fs_geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 2));

    const triangle = new THREE.Mesh(fs_geometry, shaderMaterial);
    bufferScene.add(triangle);


    //sphere in first portal
    const sphere = new THREE.Mesh( spheregeometry, new THREE.MeshBasicMaterial( { map: bufferTexture.texture } ) );
    sphere.position.y = portalList[0].portalLocation[1];
    scene.add(sphere);

    //cube in second portal
    // Create a cube
    const geometry = new THREE.BoxGeometry();
    const cube = new THREE.Mesh(geometry, glowMaterial);
    cube.scale.set(2.0, 2.0, 2.0)
    cube.position.y = portalList[1].portalLocation[1];
    scene.add(cube);

    //cylinder in third portal
    const cylindergeo = new THREE.CylinderGeometry();
    const cylinder = new THREE.Mesh(cylindergeo, new THREE.MeshStandardMaterial({ color: "white" }));
    cylinder.scale.set(2.0, 2.0, 2.0)
    cylinder.position.y = portalList[2].portalLocation[1];
    scene.add(cylinder);

    // //Create a DirectionalLight
    const light = new THREE.DirectionalLight( 0xffffff, 1 );
    light.position.set( 0, 70, 1 ); //default; light shining from top
    scene.add( light );

    controls.update();

    function renderPortal( thisPortalMesh, otherPortalMesh, thisPortalTexture, pc ) {

        // set the portal camera position to be reflected about the portal plane
        thisPortalMesh.worldToLocal( reflectedPosition.copy( camera.position ) );
        reflectedPosition.x *= - 1.0; reflectedPosition.z *= - 1.0;
        otherPortalMesh.localToWorld( reflectedPosition );
        pc.position.copy( reflectedPosition );

        // grab the corners of the other portal
        // - note: the portal is viewed backwards; flip the left/right coordinates
        otherPortalMesh.localToWorld( bottomLeftCorner.set( 5.05, - 5.05, 0.0 ) );
        otherPortalMesh.localToWorld( bottomRightCorner.set( - 5.05, - 5.05, 0.0 ) );
        otherPortalMesh.localToWorld( topLeftCorner.set( 5.05, 5.05, 0.0 ) );
        // set the projection matrix to encompass the portal's frame
        CameraUtils.frameCorners( pc, bottomLeftCorner, bottomRightCorner, topLeftCorner, false );

        // render the portal
        thisPortalTexture.texture.colorSpace = renderer.outputColorSpace;
        renderer.setRenderTarget( thisPortalTexture );
        renderer.state.buffers.depth.setMask( true ); // make sure the depth buffer is writable so it can be properly cleared
        if ( renderer.autoClear === false ) renderer.clear();
        thisPortalMesh.visible = false; // hide this portal from its own rendering
        renderer.render( scene, pc );
        thisPortalMesh.visible = true; // re-enable this portal's visibility for general rendering

    }

    // Animation
    const animate = () => {

        requestAnimationFrame(animate);

        controls.update();
        renderer.setSize(400, 400)
        //render to fullscreen quad texture used for sphere texture
        renderer.setRenderTarget(bufferTexture); 
        renderer.render(bufferScene,pixelShaderCamera);  

        //set size to main render size
        renderer.setSize(1280, 720);

        portalList.forEach(function (object){
            renderPortal(object.portals[0], object.portals[1], object.portalTextures[0], object.camera);
            renderPortal(object.portals[1], object.portals[0], object.portalTextures[1], object.camera );
        })

        renderer.setRenderTarget( null );//back to default framebuffer
        
        renderer.render(scene, camera);

        //ubdate shader uniforms
        shaderMaterial.uniforms.iTime.value += 0.01;
        shaderMaterial.uniforms.iFrame.value += 1.0;

        glowMaterial.uniforms.iTime.value += 0.01;
        
    };

    function createBoxPortalMesh(position, otherposition, size){

        let portalObject = {}

        let geometry = new THREE.BoxGeometry();
        let cube = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ side: THREE.BackSide, color: 0x00ff00 }));
        cube.scale.set(size, size, size)
        cube.position.y = position[1];

        portalObject.mesh = cube;
        portalObject.portalLocation = position;

        let topPortalTexture = new THREE.WebGLRenderTarget( 256, 256 );
                let topPortal = new THREE.Mesh( new THREE.PlaneGeometry( size, size), new THREE.MeshBasicMaterial( { map: topPortalTexture.texture } ) );
                topPortal.position.x = position[0];
                topPortal.position.z = position[2]-size/2;
                topPortal.position.y = position[1];


        let bottomPortalTexture = new THREE.WebGLRenderTarget( 256, 256 );
                let bottomPortal = new THREE.Mesh( new THREE.PlaneGeometry( size, size), new THREE.MeshBasicMaterial( { map: bottomPortalTexture.texture } ) );
                bottomPortal.position.x = otherposition[0];
                bottomPortal.position.y = otherposition[1];
                bottomPortal.position.z = otherposition[2]+size/2;

        portalObject.portals = [topPortal, bottomPortal];
        portalObject.portalTextures = [topPortalTexture, bottomPortalTexture];

        let portalCamera = new THREE.PerspectiveCamera( 45, 1.0, 0.1, 500.0 );

        portalObject.camera = portalCamera;

        let light = new THREE.PointLight( 0xe7e7e7, 0.5, 2, 0 );
        light.position.y = position[1];
        
        portalObject.light = light;

        return portalObject;

    }

    animate();
}

export default portalRendering;

