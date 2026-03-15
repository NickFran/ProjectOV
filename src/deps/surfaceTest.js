import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';

const scene = new THREE.Scene();
scene.background = new THREE.Color( 0x003f67 );
const camera = new THREE.PerspectiveCamera( 60, window.innerWidth / window.innerHeight, 0.1, 100000 );

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

        // Auto-frame the loaded object
        const box = new THREE.Box3().setFromObject( obj );
        const center = box.getCenter( new THREE.Vector3() );
        const size = box.getSize( new THREE.Vector3() );
        const maxDim = Math.max( size.x, size.y, size.z );
        const fov = camera.fov * ( Math.PI / 180 );
        const dist = maxDim / ( 2 * Math.tan( fov / 2 ) );

        camera.position.set( center.x, center.y + dist, center.z + dist * 0.5 );
        camera.far = Math.max( 100000, dist * 10 );
        camera.near = dist * 0.001;
        camera.updateProjectionMatrix();

        controls.target.copy( center );
        controls.update();

        console.log( 'OBJ loaded — bounding box size:', size, 'center:', center );
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

function animate() {
    requestAnimationFrame( animate );
    controls.update();
    renderer.render( scene, camera );
}
animate();