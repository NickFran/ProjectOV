import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';


// Get neighboring coordinates (6-connected)

const scene = new THREE.Scene();
scene.background = new THREE.Color( 0x003f67 );
const camera = new THREE.PerspectiveCamera( 60, window.innerWidth / window.innerHeight, 0.001, 100000 );

const renderer = new THREE.WebGLRenderer();
renderer.setSize( window.innerWidth, window.innerHeight );
document.body.appendChild( renderer.domElement );

scene.add( new THREE.AmbientLight( 0x404040 ) );
const dirLight = new THREE.DirectionalLight( 0xffffff, 1 );
dirLight.position.set( 5, 10, 7 );
scene.add( dirLight );

// Axes helper: Red=X(lon), Green=Y(up/elev), Blue=Z(lat)
const axesHelper = new THREE.AxesHelper( 5 );
scene.add( axesHelper );

// Ground plane at origin
// const planeGeo = new THREE.PlaneGeometry( 100, 100 );
// const planeMat = new THREE.MeshStandardMaterial( { color: 0x224488, transparent: true, opacity: 0.5, side: THREE.DoubleSide } );
// const plane = new THREE.Mesh( planeGeo, planeMat );
// plane.rotation.x = -Math.PI / 2;
// scene.add( plane );

// Load SubThingy FBX at origin
const fbxLoader = new FBXLoader();
fbxLoader.load(
    '../Storage/SubThingy.fbx',
    function ( fbx ) {
        fbx.position.set( 0, -3.600, 0 );
        fbx.scale.set( 0.000001, 0.000001, 0.000001 );
        fbx.rotation.x = -Math.PI / 2;
        fbx.rotation.z = -Math.PI / 2;
        scene.add( fbx );

        // Attach a cone as a child of the FBX
        const coneGeo = new THREE.ConeGeometry( 0.15, 0.2, 16 );
        const coneMat = new THREE.MeshStandardMaterial( { color: 0xff0000, wireframe: true } );
        const cone = new THREE.Mesh( coneGeo, coneMat );
        cone.position.set( fbx.position.x, fbx.position.y+950, fbx.position.z + 0.05 );
        cone.scale.set( 1000, 1000, 1000 );
        cone.rotation.x = Math.PI / 1;
        fbx.add( cone );

        // Yellow dot at a cone vertex (tip), converted to world space
        fbx.updateMatrixWorld( true );
        const posAttr = coneGeo.attributes.position;
        const tipVertex = new THREE.Vector3(
            posAttr.getX( 0 ),
            posAttr.getY( 0 ),
            posAttr.getZ( 0 )
        );
        cone.localToWorld( tipVertex );
        console.log( 'Cone tip world pos:', tipVertex );

        const dotGeo = new THREE.SphereGeometry( 0.005, 8, 8 );
        const dotMat = new THREE.MeshBasicMaterial( { color: 0xffff00 } );
        const dot = new THREE.Mesh( dotGeo, dotMat );
        dot.position.copy( tipVertex );
        dot.scale.set( .001, .001, .001 ); // Scale up to match the cone's size
        scene.add( dot );

        // Raycast from the tip vertex to every other vertex in the cone
        const raycaster = new THREE.Raycaster();
        const rayLineMat = new THREE.LineBasicMaterial( { color: 0x00ff00 } );
        const hitDotGeo = new THREE.SphereGeometry( 0.003, 6, 6 );
        const hitDotMat = new THREE.MeshBasicMaterial( { color: 0xff00ff } );

        for ( let i = 1; i < posAttr.count; i++ ) {
            const targetVertex = new THREE.Vector3(
                posAttr.getX( i ),
                posAttr.getY( i ),
                posAttr.getZ( i )
            );
            cone.localToWorld( targetVertex );

            const direction = new THREE.Vector3().subVectors( targetVertex, tipVertex ).normalize();
            const distance = tipVertex.distanceTo( targetVertex );

            raycaster.set( tipVertex, direction );
            raycaster.far = distance;

            // Collect all meshes in the scene to test against (excluding cone itself)
            const testObjects = [];
            scene.traverse( function ( child ) {
                if ( child.isMesh && child !== cone && child !== dot ) {
                    testObjects.push( child );
                }
            });

            const intersects = raycaster.intersectObjects( testObjects, false );

            // Draw the ray line
            const lineGeo = new THREE.BufferGeometry().setFromPoints( [ tipVertex, targetVertex ] );
            const line = new THREE.Line( lineGeo, rayLineMat );
            scene.add( line );

            // Mark hit points
            if ( intersects.length > 0 ) {
                const hitDot = new THREE.Mesh( hitDotGeo, hitDotMat );
                hitDot.position.copy( intersects[0].point );
                scene.add( hitDot );
                console.log( `Ray ${i}: HIT at`, intersects[0].point, 'distance:', intersects[0].distance );
            } else {
                console.log( `Ray ${i}: no hit` );
            }

            // Continue ray from the target vertex in the same direction (orange)
            const extRayLineMat = new THREE.LineBasicMaterial( { color: 0xffa500 } );
            const extHitDotMat = new THREE.MeshBasicMaterial( { color: 0x00ffff } );
            const extEnd = targetVertex.clone().add( direction.clone().multiplyScalar( distance ) );

            raycaster.set( targetVertex, direction );
            raycaster.far = distance;

            const extIntersects = raycaster.intersectObjects( testObjects, false );

            const extLineGeo = new THREE.BufferGeometry().setFromPoints( [ targetVertex, extEnd ] );
            const extLine = new THREE.Line( extLineGeo, extRayLineMat );
            scene.add( extLine );

            if ( extIntersects.length > 0 ) {
                const extHitDot = new THREE.Mesh( hitDotGeo, extHitDotMat );
                extHitDot.position.copy( extIntersects[0].point );
                scene.add( extHitDot );
                console.log( `ExtRay ${i}: HIT at`, extIntersects[0].point, 'distance:', extIntersects[0].distance );
            } else {
                console.log( `ExtRay ${i}: no hit` );
            }
        }

        // Center camera on the FBX object
        const fbxPos = fbx.position;
        camera.position.set( fbxPos.x + 0.001, fbxPos.y + 0.01, fbxPos.z + 0.001 );
        controls.target.copy( fbxPos );
        controls.update();

        console.log( 'FBX loaded' );
    },
    undefined,
    function ( error ) {
        console.error( 'Error loading FBX:', error );
    }
);

const loader = new OBJLoader();
loader.load(
    '../Storage/bathymetry.obj',
    function ( obj ) {
        const material = new THREE.MeshMatcapMaterial( { color: 0x0077be, side: THREE.DoubleSide } );
        obj.traverse( function ( child ) {
            if ( child.isMesh ) {
                child.material = material;
            }
        });
        scene.add( obj );
        obj.scale.set( .00001, .0001, .00001 ); // Scale up to match the FBX

        console.log( 'OBJ loaded' );
    },
    function ( xhr ) {
        if ( xhr.total > 0 ) {
            console.log( ( xhr.loaded / xhr.total * 100 ) + '% loaded' );
        } else {
            console.log( ( xhr.loaded / 1024 ).toFixed(1) + ' KB loaded' );
        }
    },
    function ( error ) {
        console.error( 'Error loading OBJ:', error );
    }
);

camera.position.z = 5;

const controls = new OrbitControls( camera, renderer.domElement );

controls.zoomSpeed = 2.0; // Increase for faster zoom (default is 1.0)

function animate() {
    requestAnimationFrame( animate );
    controls.update();
    renderer.render( scene, camera );
}
animate();

// Get vertex positions from the cone geometry
const posAttr = coneGeo.attributes.position;

// Pick a vertex index (0 = tip of the cone)
const vertexIndex = 0;
const vertex = new THREE.Vector3(
    posAttr.getX( vertexIndex ),
    posAttr.getY( vertexIndex ),
    posAttr.getZ( vertexIndex )
);

// Add a small sphere at that vertex
const dotGeo = new THREE.SphereGeometry( 0.02, 8, 8 );
const dotMat = new THREE.MeshBasicMaterial( { color: 0xffff00 } );
const dot = new THREE.Mesh( dotGeo, dotMat );
dot.position.copy( vertex );
dot.scale.set( 100000, 100000, 100000 ); // Scale up to match the cone's size
cone.add( dot ); // child of cone, so it follows its transforms