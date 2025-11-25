import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import Stats from "three/examples/jsm/libs/stats.module.js";

const renderer = new THREE.WebGLRenderer({ antialis: true });
const stats = new Stats();
const mouse = new THREE.Vector2();
const raycaster = new THREE.Raycaster();

const scene = new THREE.Scene();
const loader = new GLTFLoader();
const light = new THREE.SpotLight(0xffffff, Math.PI * 20);
const camera = new THREE.PerspectiveCamera(
  45,
  window.innerWidth / window.innerHeight,
  0.25,
  20,
);
const controls = new OrbitControls(camera, renderer.domElement);
const axesHelper = new THREE.AxesHelper(5);
const gridHelper = new THREE.GridHelper();

// Studio lighting
const ambient = new THREE.AmbientLight(0xffffff, 1.5);
// Soft Key Light
const keyLight = new THREE.DirectionalLight(0xffffff, 2);
// Fill light
const fillLight = new THREE.DirectionalLight(0xffffff, 1);
// Back light (rim light)
const rimLight = new THREE.DirectionalLight(0xffffff, 1);

renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

window.addEventListener("click", onClick);

light.position.set(7, 5, 5);

scene.add(ambient);

keyLight.position.set(4, 10, 6);
keyLight.castShadow = true;
scene.add(keyLight);

fillLight.position.set(-6, 8, 4);
scene.add(fillLight);

rimLight.position.set(0, 5, -6);
scene.add(rimLight);

// White background
scene.background = new THREE.Color(0xffffff);

scene.add(light);
const buttonMeshes = [];
loader.load(
  // "./OpenArcadeAssy_v1.glb",
  "./assets/OAColouredButtons.glb",
  function (gltf) {
    gltf.scene.traverse(function (child) {
      if (child.isMesh && child.parent?.name.startsWith("ArcadeButton")) {
        buttonMeshes.push(child);
      }
    });
    gltf.scene.scale.set(10, 10, 10);
    console.log(gltf.scene);
    gltf.scene.traverse((o) => console.log(o.name, o));

    gltf.scene.position.set(-1, 0, 0);
    scene.add(gltf.scene);
  },
  undefined,
  function (error) {
    console.error(error);
  },
);
function animate() {
  requestAnimationFrame(animate);
  controls.update();
  render();
  stats.update();
}
renderer.shadowMap.enabled = true;

camera.position.set(0, 2, 5);

function onClick(event) {
  event.preventDefault();

  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);

  var intersects = raycaster.intersectObjects(buttonMeshes);

  if (intersects.length > 0) {
    const mesh = intersects[0].object;
    const actual = mesh.parent;
    actual.visible = !actual.visible;
  }

  render();
}

function render() {
  renderer.render(scene, camera);
}

animate();
