import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';

// import { mod } from 'three/tsl'; // Uncomment if needed and available

function testLine() {
    const testLine = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(10, 0, 0)
        ]),
        new THREE.LineBasicMaterial({ color: 0xff00ff })
    );
    scene.add(testLine);
}
const scene = new THREE.Scene();
const renderer = new THREE.WebGLRenderer();
const camera = new THREE.PerspectiveCamera( 60, window.innerWidth / window.innerHeight, 0.001, 100000 );
let gebcoMesh = null;

const scaleFactors = {
    sub: () => [0.000001, 0.000001, 0.000001],
    gebco: () => [0.01, 0.1, 0.01]
}

const GEBCOTiles = [];
const virtualOrigin = new THREE.Vector3(-0.5, 528, 0);
let controls = null;
let axesHelper = null;
let frustrumCone = null;

function printSceneInfo() {
    console.log('Scene Information:');
    console.log('Number of objects in the scene:', scene.children.length);
    console.log('Camera position:', camera.position);
    console.log('Camera rotation:', camera.rotation);
    console.log('Camera field of view:', camera.fov);
    console.log('Camera aspect ratio:', camera.aspect);
    console.log('Camera near plane:', camera.near);
    console.log('Camera far plane:', camera.far);
    console.log('Renderer info:', renderer.info);
    console.log('Renderer capabilities:', renderer.capabilities);
    console.log('Renderer parameters:', renderer.getContextAttributes());
    console.log('GEBCO Mesh:', gebcoMesh);
    console.log('GEBCO Tiles loaded:', GEBCOTiles.length);
    console.log('GEBCO Tiles:', GEBCOTiles);
    console.log('Scene children:', scene.children);
    console.log('Scene background:', scene.background);
    console.log('Scene fog:', scene.fog);
}



class acousticRay {
    constructor(origin, end, params = {}) {
        this.track = []; // To store the path of the ray
        this.raycaster = null;
        this.line = null; // For visualization purposes
        this.origin = origin;
        this.end = end;
        this.direction = new THREE.Vector3().subVectors(end, origin).normalize();
        this.params = params;
    }

    init() {
        // Initialize ray parameters, e.g., speed, frequency, etc.
        this.raycaster = new THREE.Raycaster(this.origin.clone(), this.direction.clone());
        this.raycaster.far = this.origin.distanceTo(this.end);

        this.line = new THREE.Line(
            new THREE.BufferGeometry().setFromPoints([this.origin.clone(), this.end.clone()]),
            new THREE.LineBasicMaterial({ color: 0x00ff00 })
        );
        scene.add(this.line);
    }

    updateEndpoints(newOrigin, newEnd) {
        this.origin.copy(newOrigin);
        this.end.copy(newEnd);
        this.direction.subVectors(this.end, this.origin).normalize();
        if (this.raycaster) {
            this.raycaster.set(this.origin.clone(), this.direction.clone());
            this.raycaster.far = this.origin.distanceTo(this.end);
        }
        // Update the line geometry with new, cloned points
        if (this.line && this.line.geometry) {
            const points = [this.origin.clone(), this.end.clone()];
            this.line.geometry.setFromPoints(points);
            this.line.geometry.attributes.position.needsUpdate = true;
        }
    }

    renderLine() {
        if (this.line && this.track.length > 0) {
            // Flatten track: start with the first point, then add each segment's end
            const points = [this.track[0][0].clone()];
            for (const segment of this.track) {
                points.push(segment[1].clone());
            }
            this.line.geometry.setFromPoints(points);
        }
    }

    propagate(firstStep) {
        if (firstStep) {
            this.updateEndpoints(this.origin, this.end);
            this.track.push([this.origin.clone(), this.end.clone()]);
            
        }
        // Implement ray propagation logic, including interactions with the environment
        // This could involve checking for intersections with objects in the scene
        // and applying reflection, refraction, or absorption based on material properties
    }
}

class FrustrumRayTracer {
    constructor(scene, camera) {
        this.scene = scene;
        this.camera = camera;
        this.raycaster = new THREE.Raycaster();
        this.cone = null; // Will hold the cone mesh for visualization
        this.height = null;
    }

    init(resolution = 64, height = 0.8) {
        this.height = height;
        const coneGeo = new THREE.ConeGeometry( 0.15, height, resolution );
        coneGeo.translate(0, -(height / 2), 0); // shift apex to local origin so scaling grows outward
        const coneMat = new THREE.MeshStandardMaterial( { color: 0xff0000, wireframe: true } );
        const cone = new THREE.Mesh( coneGeo, coneMat );
        cone.position.set( virtualOrigin.x, virtualOrigin.y, virtualOrigin.z );
        cone.scale.set( 1, 1, 1 );
        cone.rotation.x = Math.PI / 1;
        this.cone = cone;
        cone.name = 'Frustrum Cone';
        this.scene.add(cone);
        frustrumCone = cone;
    }

    attatchToObject(object){
        object.add(this.cone);
    }

    setConeDirection(dirVector){
        // Assuming dirVector is a normalized THREE.Vector3
        const targetQuaternion = new THREE.Quaternion().setFromUnitVectors(
            new THREE.Vector3(0, 1, 0), // Original cone direction (pointing up)
            dirVector
        );
        this.cone.setRotationFromQuaternion(targetQuaternion);
    }

    setConePosition(position){
        this.cone.position.copy(position);
    }

    setConeDiameter(diameter){
        this.cone.scale.set(diameter, this.cone.scale.y, diameter);
    }

    setConeLength(length){
        this.cone.scale.y = length;
    }

    iterateEdges(callback) {
    const geometry = this.cone.geometry;
    geometry.computeBoundingBox();

    const pos = geometry.getAttribute('position');
    const apexLocal = new THREE.Vector3(0, 0, 0); // your cone is translated so apex is local origin
    const apexWorld = this.cone.localToWorld(apexLocal.clone());

    for (let i = 0; i < pos.count; i++) {
        const endLocal = new THREE.Vector3().fromBufferAttribute(pos, i);
        if (endLocal.equals(apexLocal)) continue;
        const endWorld = this.cone.localToWorld(endLocal.clone());
        const apexWorld = this.cone.localToWorld(apexLocal.clone());
        console.log('apexWorld:', apexWorld, 'endWorld:', endWorld);
        console.log('apexLocal:', apexLocal, 'endLocal:', endLocal);
        console.log('cone scale:', this.cone.scale);
        console.log('cone matrixWorld:', this.cone.matrixWorld);
        callback(apexWorld.clone(), endWorld);
        console.log('start:', apexWorld.clone(), 'end:', endWorld);
    }
}

    startSimulation(expansionSteps = 360, expansionStepSize = 0.01, callback = null) {
        for (let i = 0; i < expansionSteps; i++) {
            setTimeout(() => {
                this.setConeDiameter(i * expansionStepSize);
                this.setConeLength(this.height + (-i*0.001));
                if (callback) this.iterateEdges(callback);
            }, i * 10); // Delay increases with each iteration
        }
    }
}

class GEBCOTIle {
    constructor() {
        this.mesh = null;
        this.boundingBox = null;
        this.spawnPosition = null;
    }

    load(path, scale = scaleFactors.gebco) {
        return new Promise((resolve, reject) => {
            const loader = new OBJLoader();
            loader.load(
                path,
                (obj) => {
                    const material = new THREE.MeshMatcapMaterial( { color: 0x0077be, side: THREE.DoubleSide } );
                    obj.traverse( function ( child ) {
                        if ( child.isMesh ) {
                            child.material = material;
                        }
                    });
                    this.mesh = obj;
                    this.boundingBox = new THREE.Box3().setFromObject(obj);

                    // Ensure scale is an array of three numbers
                    const scaleValues = scale();
                    if (!Array.isArray(scaleValues) || scaleValues.length !== 3) {
                        console.error('Scale must be an array of three numbers [x, y, z].');
                        reject(new Error('Invalid scale values'));
                        return;
                    }

                    obj.scale.set(...scaleValues);
                    resolve();
                },
                (xhr) => {
                    if (xhr.total > 0) {
                        console.log((xhr.loaded / xhr.total * 100) + '% loaded');
                    } else {
                        console.log((xhr.loaded / 1024).toFixed(1) + ' KB loaded');
                    }
                },
                (error) => {
                    console.error('Error loading OBJ:', error);
                    reject(error);
                }
            );
            GEBCOTiles.push(this);
        });
        
    }

    spawn(spawnPosition) {
        this.spawnPosition = spawnPosition;
        this.mesh.position.copy(this.spawnPosition);
        scene.add(this.mesh);
    }
}

function initScreen(){
    scene.background = new THREE.Color( 0x003f67 );

    const container = document.getElementById('viewport');
    renderer.setSize( container.clientWidth, container.clientHeight );
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    container.appendChild( renderer.domElement );
}

function initCamera(){
    controls = new OrbitControls( camera, renderer.domElement );
    
    controls.zoomSpeed = 2.0;
    controls.panSpeed = 0.5;
    controls.target.copy(virtualOrigin);
    camera.position.set(virtualOrigin.x, virtualOrigin.y, virtualOrigin.z + 5);
    controls.update();
}

function setVirtualOrigin(position, viewDistance = 1) {
    virtualOrigin.copy(position);
    if (controls) {
        controls.target.copy(virtualOrigin);
    }
    camera.position.set(virtualOrigin.x, virtualOrigin.y + viewDistance * 0.1, virtualOrigin.z + viewDistance);
    if (controls) {
        controls.update();
    }
    if (axesHelper) {
        axesHelper.position.copy(virtualOrigin);
    }
    if (frustrumCone) {
        frustrumCone.position.copy(virtualOrigin);
    }
}

function setCameraPosition(x, y, z){
    camera.position.set(x, y, z);
    camera.lookAt(0, 0, 0);
}

function animate() {
  requestAnimationFrame(animate);
  // Assuming scene, camera, renderer are accessible (export or attach to window)
  renderer.render(scene, camera);
  //console.log(renderer.info.memory);
}

function renderAxisHelper(){
    axesHelper = new THREE.AxesHelper( 5 );
    axesHelper.name = 'Axes Helper';
    scene.add( axesHelper );
    axesHelper.position.copy(virtualOrigin);
}

function includeLights(){
    const ambientLight = new THREE.AmbientLight( 0x404040 );
    ambientLight.name = 'Ambient Light';
    scene.add( ambientLight );
    const dirLight = new THREE.DirectionalLight( 0xffffff, 3 );
    dirLight.name = 'Directional Light';
    dirLight.position.set( 5, 10, 7 );
    scene.add( dirLight );
}

async function importGEBCO() {
    const tile = new GEBCOTIle();
    tile.boundingBox = new THREE.Box3();
    try {
        await tile.load('../Storage/tiles/tile_0_0.obj');
        tile.spawn(new THREE.Vector3(0, 0, 0));
        gebcoMesh = tile.mesh;
    } catch (error) {
        console.error('Error loading GEBCO tile:', error);
    }
}

async function importGEBCOTiles() {
    // This function gets all file names in ../Storage/tiles/
    try {
        const fs = require('fs');
        const path = require('path');
        const tilesDir = path.resolve(__dirname, '../Storage/tiles/');
        const files = fs.readdirSync(tilesDir);
        // Filter for .obj files only
        //return files.filter(f => f.endsWith('.obj'));
        let originSet = false;
        for (const file of files) {
            if (file.endsWith('.obj')) {
                const tile = new GEBCOTIle();
                await tile.load(path.join(tilesDir, file));
                tile.mesh.name = file;
                tile.spawn(new THREE.Vector3(0, 0, 0));
                // Use the first tile's geometry center as the virtual origin
                if (!originSet) {
                    const box = new THREE.Box3().setFromObject(tile.mesh);
                    const center = new THREE.Vector3();
                    const size = new THREE.Vector3();
                    box.getCenter(center);
                    box.getSize(size);
                    const viewDistance = Math.max(size.x, size.y, size.z) * 2;
                    setVirtualOrigin(center);
                    originSet = true;
                }
            }
        }
    } catch (err) {
        console.error('Error reading tiles directory:', err);
        return [];
    }
}

function importSubThingy(position = new THREE.Vector3(0, 0, 0)) {
    const fbxLoader = new FBXLoader();
    fbxLoader.load(
        '../Storage/SubThingy.fbx',
        function ( fbx ) {
            fbx.position.set(0,0,0);
            fbx.scale.set( 0.000001, 0.000001, 0.000001 );
            fbx.rotation.x = -Math.PI / 2;
            fbx.rotation.z = -Math.PI / 2;
            scene.add( fbx );
        }
    )

}

function makeRuler(start, end, tickInterval) {
        // Main ruler line from start to end (THREE.Vector3)
        const points = [start.clone(), end.clone()];
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const material = new THREE.LineBasicMaterial({ color: 0xffff00 });
        const rulerLine = new THREE.Line(geometry, material);
        scene.add(rulerLine);

        // Tick marks along the ruler
        const rulerVec = new THREE.Vector3().subVectors(end, start);
        const length = rulerVec.length();
        const dir = rulerVec.clone().normalize();
        const numTicks = Math.floor(length / tickInterval);
        for (let i = 0; i <= numTicks; i++) {
                const t = i * tickInterval;
                const tickPos = start.clone().add(dir.clone().multiplyScalar(t));
                // Tick direction: perpendicular in Y (for X axis ruler)
                const tickOffset = new THREE.Vector3(0, 0.2, 0);
                const tickStart = tickPos.clone().sub(tickOffset);
                const tickEnd = tickPos.clone().add(tickOffset);
                const tickPoints = [tickStart, tickEnd];
                const tickGeometry = new THREE.BufferGeometry().setFromPoints(tickPoints);
                const tick = new THREE.Line(tickGeometry, new THREE.LineBasicMaterial({ color: 0xffffff }));
                scene.add(tick);
        }
}

function constructMapRuler(tickInterval){
    if (!gebcoMesh) {
        console.warn("GEBCO mesh not loaded yet.");
        return;
    }
    const box = new THREE.Box3().setFromObject(gebcoMesh);
    const min = box.min;
    const max = box.max;
    const start = new THREE.Vector3(min.x, min.y, min.z);
    const end = new THREE.Vector3(max.x, min.y, min.z);
    makeRuler(start, end, tickInterval);
}

function addChildrenToMenu(){
    const list = document.querySelector('.objectList');
    list.innerHTML = ''; // Clear existing list items
    for (const child of scene.children) {
        console.log(child);
        const listItem = document.createElement('li');
        listItem.classList.add('objectListItem');
        listItem.textContent = child.name || 'Unnamed Mesh';
        list.appendChild(listItem);

        listItem.addEventListener('click', () => {
            console.log('Clicked on:', child);
            const details = document.querySelector('.detailsList');
            details.innerHTML = ''; // Clear previous details
            const detailName = child.name || 'Unnamed Mesh';
            const detailType = child.type;
            const detailPosition = `(${child.position.x.toFixed(2)}, ${child.position.y.toFixed(2)}, ${child.position.z.toFixed(2)})`;
            const detailRotation = `(${child.rotation.x.toFixed(2)}, ${child.rotation.y.toFixed(2)}, ${child.rotation.z.toFixed(2)})`;
            const detailScale = `(${child.scale.x.toFixed(2)}, ${child.scale.y.toFixed(2)}, ${child.scale.z.toFixed(2)})`;
             
            const posDisTxt = document.createElement('p');
            posDisTxt.textContent = 'Pos:';
            const posInX = document.createElement('input');
            posInX.type = 'number';
            posInX.value = child.position.x.toFixed(2);
            const posInY = document.createElement('input');
            posInY.type = 'number';
            posInY.value = child.position.y.toFixed(2);
            const posInZ = document.createElement('input');
            posInZ.type = 'number';
            posInZ.value = child.position.z.toFixed(2);
            const detailPositionOptions = document.createElement('div');
            detailPositionOptions.classList.add('detailOptions');
            detailPositionOptions.appendChild(posDisTxt);
            detailPositionOptions.appendChild(posInX);
            detailPositionOptions.appendChild(posInY);
            detailPositionOptions.appendChild(posInZ);
            posInX.addEventListener('change', () => {
                child.position.x = parseFloat(posInX.value);
            });
            posInY.addEventListener('change', () => {
                child.position.y = parseFloat(posInY.value);
            });
            posInZ.addEventListener('change', () => {                
                child.position.z = parseFloat(posInZ.value);
            });


            const rotDisTxt = document.createElement('p');
            rotDisTxt.textContent = 'Rot:';
            const rotInX = document.createElement('input');
            rotInX.type = 'number';
            rotInX.value = child.rotation._x.toFixed(2);
            const rotInY = document.createElement('input');
            rotInY.type = 'number';
            rotInY.value = child.rotation._y.toFixed(2);
            const rotInZ = document.createElement('input');
            rotInZ.type = 'number';
            rotInZ.value = child.rotation._z.toFixed(2);
            const detailRotationOptions = document.createElement('div');
            detailRotationOptions.classList.add('detailOptions');
            detailRotationOptions.appendChild(rotDisTxt);
            detailRotationOptions.appendChild(rotInX);
            detailRotationOptions.appendChild(rotInY);
            detailRotationOptions.appendChild(rotInZ);
            rotInX.addEventListener('change', () => {
                child.rotation.x = parseFloat(rotInX.value);
            });
            rotInY.addEventListener('change', () => {
                child.rotation.y = parseFloat(rotInY.value);
            });
            rotInZ.addEventListener('change', () => {                
                child.rotation.z = parseFloat(rotInZ.value);
            });


            const sclDisTxt = document.createElement('p');
            sclDisTxt.textContent = 'Scl:';
            const sclInX = document.createElement('input');
            sclInX.type = 'number';
            sclInX.value = child.scale.x.toFixed(2);
            const sclInY = document.createElement('input');
            sclInY.type = 'number';
            sclInY.value = child.scale.y.toFixed(2);
            const sclInZ = document.createElement('input');
            sclInZ.type = 'number';
            sclInZ.value = child.scale.z.toFixed(2);
            const detailScaleOptions = document.createElement('div');
            detailScaleOptions.classList.add('detailOptions');
            detailScaleOptions.appendChild(sclDisTxt);
            detailScaleOptions.appendChild(sclInX);
            detailScaleOptions.appendChild(sclInY);
            detailScaleOptions.appendChild(sclInZ);
            sclInX.addEventListener('change', () => {
                child.scale.x = parseFloat(sclInX.value);
            });
            sclInY.addEventListener('change', () => {
                child.scale.y = parseFloat(sclInY.value);
            });
            sclInZ.addEventListener('change', () => {                
                child.scale.z = parseFloat(sclInZ.value);
            });

            const focusBtn = document.createElement('button');
            focusBtn.textContent = 'Focus';

            details.appendChild(detailPositionOptions);
            details.appendChild(detailRotationOptions);
            details.appendChild(detailScaleOptions);
            details.appendChild(focusBtn);

            focusBtn.addEventListener('click', () => {
                const box = new THREE.Box3().setFromObject(child);
                const center = new THREE.Vector3();
                const size = new THREE.Vector3();
                box.getCenter(center);
                box.getSize(size);
                const maxDim = Math.max(size.x, size.y, size.z);
                const halfFovRad = THREE.MathUtils.degToRad(camera.fov / 2);
                const distance = maxDim > 0
                    ? (maxDim / 2) / Math.tan(halfFovRad) * 1.5
                    : 5;
                const dirRaw = camera.position.clone().sub(controls.target);
                const direction = dirRaw.lengthSq() > 0
                    ? dirRaw.normalize()
                    : new THREE.Vector3(0, 0.5, 1).normalize();
                const newPos = center.clone().add(direction.multiplyScalar(distance));
                controls.target.copy(center);
                camera.position.copy(newPos);
                controls.update();
            });
            //details.appendChild
            // Implement any additional interaction logic here (e.g., highlight the object)
        });
    }
}

export {
    initScreen,
    initCamera,
    renderAxisHelper,
    includeLights,
    importGEBCO,
    importSubThingy,
    animate,
    makeRuler,
    constructMapRuler,
    importGEBCOTiles,
    FrustrumRayTracer,
    GEBCOTIle,
    scene,
    setCameraPosition,
    printSceneInfo,
    setVirtualOrigin,
    addChildrenToMenu,
    acousticRay,
    testLine
};