import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { gsap } from "gsap";
import * as dat from "dat.gui";

const config = {
    cheat: false,
    blockSpeed: 50,
};

// only if the url has a #debug, show the gui
if (window.location.hash === "#cheater") {
    const gui = new dat.GUI();
    gui.add(config, "cheat").name("Enable Hacks");
    gui.add(config, "blockSpeed").min(0).max(1000).step(1).name("Block Speed");
}

const sizes = {
    width: window.innerWidth,
    height: window.innerHeight,
};

const textureLoader = new THREE.TextureLoader();
const matcapTexture = textureLoader.load("/matcap.png");

const canvas = document.querySelector("canvas.webgl");
const score = document.getElementById("score");

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height);

const orbitControls = new OrbitControls(camera, canvas);
orbitControls.enableDamping = true;

const renderer = new THREE.WebGLRenderer({
    canvas: canvas,
});

renderer.setSize(sizes.width, sizes.height);
renderer.render(scene, camera);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

window.addEventListener("resize", () => {
    sizes.width = window.innerWidth;
    sizes.height = window.innerHeight;

    camera.aspect = sizes.width / sizes.height;
    camera.updateProjectionMatrix();

    renderer.setSize(sizes.width, sizes.height);
    renderer.render(scene, camera);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});

const clock = new THREE.Clock(true);

let currentStackHeight = 1;
let mouseClicked = false;
let currentStackMesh = null;
let stopped = false;

const meshSize = {
    x: 30,
    z: 30,
};

const meshCenter = {
    x: 0,
    z: 0,
};

// gui.add(camera.position, "y", 0, 100, 0.1);
const tick = () => {
    requestAnimationFrame(tick);
    orbitControls.update();

    if (stopped) {
        score.innerText = "You lost at " + (currentStackHeight - 1) + " blocks";

        const timeElapsed = clock.getElapsedTime();
        gsap.to(camera.position, {
            x: Math.sin(timeElapsed) * 60,
            y: Math.abs(Math.sin(timeElapsed) * currentStackHeight * 6),
            z: Math.cos(timeElapsed) * 60,
            duration: 1,
        });
    }

    const delta = clock.getDelta();

    // 1. if there's no stack mesh, then create it
    if (!currentStackMesh && !stopped) {
        const stack = {
            geometry: new THREE.BoxGeometry(meshSize.x, 4, meshSize.z),
            material: new THREE.MeshMatcapMaterial({
                matcap: matcapTexture,
                // random color
                color: new THREE.Color(
                    Math.random() * 0.5 + 0.5,
                    Math.random() * 0.5 + 0.5,
                    Math.random() * 0.5 + 0.5
                ),
            }),
        };

        currentStackMesh = new THREE.Mesh(stack.geometry, stack.material);
        currentStackMesh.position.y = currentStackHeight * 4;

        // find the start position of the stack
        if (currentStackHeight % 2 === 0) {
            currentStackMesh.position.x = -60 - meshCenter.x;
            currentStackMesh.position.z = meshCenter.z;
        } else {
            currentStackMesh.position.x = meshCenter.x;
            currentStackMesh.position.z = -60 - meshCenter.z;
        }

        scene.add(currentStackMesh);
    }

    if (!stopped) {
        // make the stack move
        if (currentStackHeight % 2 === 0) {
            currentStackMesh.position.x += delta * config.blockSpeed;
        } else {
            currentStackMesh.position.z += delta * config.blockSpeed;
        }

        // make it lose if it goes out of bounds
        if (currentStackMesh.position.x > 60 - meshCenter.x) {
            stopped = true;
        }

        if (currentStackMesh.position.z > 60 - meshCenter.z) {
            stopped = true;
        }
    }

    const offsetX = Math.floor(currentStackMesh.position.x - meshCenter.x);
    const offsetZ = Math.floor(currentStackMesh.position.z - meshCenter.z);

    if (config.cheat) {
        if (offsetX >= 0 && offsetZ >= 0) {
            mouseClicked = true;
        }
    }

    if (mouseClicked && !stopped) {
        mouseClicked = false;

        // create two new meshes: one for the falling part and one for the part that stays
        const newSizeX = meshSize.x - Math.abs(offsetX);
        const newSizeZ = meshSize.z - Math.abs(offsetZ);

        if (newSizeX <= 0 || newSizeZ <= 0) {
            stopped = true;
        }

        if (stopped) {
            return;
        }

        const stayingMesh = new THREE.Mesh(
            new THREE.BoxGeometry(newSizeX, 4, newSizeZ),
            currentStackMesh.material
        );

        stayingMesh.position.y = currentStackHeight * 4;

        // find the appropriate x and z position for it
        stayingMesh.position.x = meshCenter.x + offsetX / 2;
        stayingMesh.position.z = meshCenter.z + offsetZ / 2;

        // create the mesh that falls
        let fallingSizeX = meshSize.x - newSizeX;
        let fallingSizeZ = meshSize.z - newSizeZ;

        if (currentStackHeight % 2 === 0) {
            fallingSizeZ = meshSize.z;
        } else {
            fallingSizeX = meshSize.x;
        }

        const fallingMesh = new THREE.Mesh(
            new THREE.BoxGeometry(fallingSizeX, 4, fallingSizeZ),
            currentStackMesh.material
        );

        fallingMesh.position.y = currentStackHeight * 4;

        // find the appropriate x and z position for it
        fallingMesh.position.x = currentStackMesh.position.x + offsetX / 2;
        fallingMesh.position.z = currentStackMesh.position.z + offsetZ / 2;

        scene.add(fallingMesh);

        // make the falling mesh fall
        gsap.to(fallingMesh.position, {
            y: fallingMesh.position.y - 4,
            duration: 0.1,
            onComplete: () => {
                scene.remove(fallingMesh);
            },
        });

        // update the mesh center
        meshCenter.x = stayingMesh.position.x;
        meshCenter.z = stayingMesh.position.z;

        meshSize.x = newSizeX;
        meshSize.z = newSizeZ;

        gsap.to(camera.position, {
            y: currentStackHeight * 4 + 40,
            duration: 0.25,
        });

        gsap.to(orbitControls.target, {
            y: currentStackHeight * 4,
        })

        scene.remove(currentStackMesh);
        currentStackMesh = null;
        currentStackHeight++;
        score.innerText = currentStackHeight;

        scene.add(stayingMesh);
    }

    renderer.render(scene, camera);
};

window.addEventListener("keypress", () => {
    mouseClicked = true;
});

window.addEventListener("touchstart", () => {
    mouseClicked = true;
});

// Now make the base of the stack
const stackBase = {
    geometry: new THREE.BoxGeometry(30, 4, 30),
    material: new THREE.MeshMatcapMaterial({ matcap: matcapTexture }),
};

const stackBaseMesh = new THREE.Mesh(stackBase.geometry, stackBase.material);
scene.add(stackBaseMesh);

camera.position.x = 30;
camera.position.y = stackBaseMesh.position.y + 40;
camera.position.z = 30;

// camera.lookAt(stackBaseMesh.position);

tick();
