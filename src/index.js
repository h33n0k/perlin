import "./style/style.scss";

import gsap from "gsap";

import * as THREE from "three";

import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass} from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { CopyShader } from "three/examples/jsm/shaders/CopyShader.js";
import { FXAAShader } from "three/examples/jsm/shaders/FXAAShader.js";

import { Reflector } from "three/examples/jsm/objects/Reflector";

import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";

import { RectAreaLightHelper } from "three/examples/jsm/helpers/RectAreaLightHelper.js";
import { BoxHelper } from "three/src/helpers/BoxHelper.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GUI } from "three/examples/jsm/libs/lil-gui.module.min.js";

import perlin from "./perlin.js";

// threejs scene

const p2d = n => n * (((Math.PI / 2) / 9) / 10);
const d2p = n => n / (((Math.PI / 2) / 9) / 10);
const wait = time => new Promise(resolve => setTimeout(resolve, time));

const sceneParameters = {
	container: document.querySelector("#scene"),
	get width() {
		return this.container.offsetWidth
	},
	get height() {
		return this.container.offsetHeight
	}
};

const ENTIRE_SCENE = 0
const BLOOM_SCENE = 1;
const bloomLayer = new THREE.Layers();
bloomLayer.set(BLOOM_SCENE);

const renderer = new THREE.WebGLRenderer({ antialias: false });
renderer.toneMappingExposure = Math.pow(.75, 4.0);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, sceneParameters.width / sceneParameters.height, 1, 600);
camera.rotation.fromArray([p2d(180), 0, p2d(180)]);

const fxaaPass = new ShaderPass(FXAAShader);
const copyPass = new ShaderPass(CopyShader);

const bloomParameters = {
	exposure: .7,
	bloomStrength: 4,
	bloomThreshold:0,
	bloomRadius: 1
};

const renderScene = new RenderPass(scene, camera);
const bloomPass = new UnrealBloomPass(new THREE.Vector2(sceneParameters.width, sceneParameters.height), 1.5, 0.4, 0.85);
bloomPass.threshold = bloomParameters.bloomThreshold;
bloomPass.strength = bloomParameters.bloomStrength;
bloomPass.radius = bloomParameters.bloomRadius;

const bloomComposer = new EffectComposer(renderer);
bloomComposer.renderToScreen = false;
bloomComposer.addPass(renderScene);
bloomComposer.addPass(bloomPass);

const finalPass = new ShaderPass(
	new THREE.ShaderMaterial({
		uniforms: {
			baseTexture: { value: null },
			bloomTexture: { value: bloomComposer.renderTarget2.texture }
		},
		vertexShader: "varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
		fragmentShader: "uniform sampler2D baseTexture; uniform sampler2D bloomTexture; varying vec2 vUv; void main() { gl_FragColor = (texture2D(baseTexture, vUv) + vec4(1.0) * texture2D(bloomTexture, vUv)); }",
		defines: {}
	}), "baseTexture"
);
finalPass.needsSwap = true;

const finalComposer = new EffectComposer(renderer);
finalComposer.addPass(renderScene);
finalComposer.addPass(finalPass);

const setSize = () => {
	camera.aspect = sceneParameters.width / sceneParameters.height;
	camera.updateProjectionMatrix();
	renderer.setSize(sceneParameters.width, sceneParameters.height);
	bloomComposer.setSize(sceneParameters.width, sceneParameters.height);
	finalComposer.setSize(sceneParameters.width, sceneParameters.height);

	renderer.setPixelRatio(window.devicePixelRatio);
	renderer.setSize(sceneParameters.width, sceneParameters.height);
	renderer.toneMapping = THREE.ReinhardToneMapping;
};

setSize();
window.onresize = setSize;

// (async () => {

// 	const light = new THREE.AmbientLight( 0x404040 ); // soft white light
// 	scene.add( light );

// 	const geometry = new THREE.BoxGeometry(2, 2, 2);
// 	const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
// 	const cube = new THREE.Mesh(geometry, material);
// 	cube.position.set(0, 2, 0);
// 	// scene.add(cube);

// })();

camera.position.set(0, 50, -110);
const intersectsGroup = new THREE.Group();

const area = new THREE.Vector2(100, 100);
let autoRefresh = true;
let lineColor = "#555555";
let [width, height] = [20, 20];
let coeff = 6;

const setGraph = () => {
	intersectsGroup.remove(...intersectsGroup.children);
	let points = new Array();
	perlin(width, height).forEach((section, i) => {
		const sectionPoints = new Array();
		const divX = (-(area.x / 2) + (area.x / (width)) * i);
		section.forEach((value, j) => {
			const divZ = (-(area.y / 2) + (area.y / (height)) * j);
			sectionPoints.push(new THREE.Vector3(divX, (value * coeff), divZ));
		});

		const geometry = new THREE.BufferGeometry().setFromPoints(sectionPoints);

		const material = new THREE.LineBasicMaterial({ color: new THREE.Color(lineColor) });
		const line = new THREE.Line(geometry, material);
		intersectsGroup.add(line);
		points.push(sectionPoints);

		const positions = geometry.attributes.position.array;

		const updatePositions = () => {
			geometry.attributes.position.needsUpdate = true;
		}

		gsap.to(positions, {
			duration: .6, // durée de l'animation
			delay: 0, // délai avant le début de l'animation
			repeat: 1, // nombre de fois que l'animation doit se répéter (-1 pour une répétition infinie)
			yoyo: true, // l'animation doit-elle être en mode yoyo ?
			onUpdate: updatePositions, // fonction de mise à jour des positions des points à chaque image de l'animation
			// startArray: positions.map(() => 0),
			endArray: new THREE.BufferGeometry().setFromPoints(sectionPoints.map(vector => new THREE.Vector3(vector.x, 0, vector.z))).attributes.position.array,
		});

	});
	const crossPoints = new Array();
	for(let i = 0; i < height; i++) {
		const array = new Array();
		for(let j = 0; j < points.length; j++) array.push(points[j][i]);
		crossPoints.push(array);
	}
	crossPoints.forEach(sectionPoints => {
		const geometry = new THREE.BufferGeometry().setFromPoints(sectionPoints);
		const material = new THREE.LineBasicMaterial({ color: new THREE.Color(lineColor) });
		const line = new THREE.Line(geometry, material);
		intersectsGroup.add(line);

		const positions = geometry.attributes.position.array;

		const updatePositions = () => {
			geometry.attributes.position.needsUpdate = true;
		}

		gsap.to(positions, {
			duration: .6, // durée de l'animation
			delay: 0, // délai avant le début de l'animation
			repeat: 1, // nombre de fois que l'animation doit se répéter (-1 pour une répétition infinie)
			yoyo: true, // l'animation doit-elle être en mode yoyo ?
			onUpdate: updatePositions, // fonction de mise à jour des positions des points à chaque image de l'animation
			// startArray: positions.map(() => 0),
			endArray: new THREE.BufferGeometry().setFromPoints(sectionPoints.map(vector => new THREE.Vector3(vector.x, 0, vector.z))).attributes.position.array,
		});
	});
	scene.add(intersectsGroup);
};

setGraph();

const refreshValues = () => $("#controls span.value").each(function() {
	$(this).text($(this).parent().parent().find("input").val());
});

$("#controls input").each(function() {
	if($(this).attr("target") === "auto_refresh") return $(this).prop("checked", autoRefresh);
	let value;
	switch($(this).attr("target")) {
		case "width":
			value = width;
			break;
		case "height":
			value = height;
			break;
		case "coeff":
			value = coeff;
			break;
		case "color":
			value = lineColor;
			break;
	};
	$(this).val(value);
})

refreshValues();

$("#controls-width").change(function(event) {
	width = parseInt($(this).val());
	refreshValues();
});

$("#controls-height").change(function(event) {
	height = parseInt($(this).val());
	refreshValues();
});

$("#controls-color").change(function(event) {
	lineColor = new THREE.Color($(this).val());
});

$("#controls-coeff").change(function(event) {
	coeff = parseInt($(this).val());
	refreshValues();
});

$("#controls-auto_refresh").change(function(event) {
	autoRefresh = $(this).is(":checked");
});

$("#controls input").change(function(event) {
	$(`${$(this).attr("id")}-value`).text($(this).val());
	if(autoRefresh) setGraph();
});

$("#controls-refresh").click(setGraph);

//dev----------------
const controls = new OrbitControls(camera, renderer.domElement);
controls.enablePan = false;
controls.enableZoom = false;
controls.autoRotateSpeed = 0.25;
controls.autoRotate = true;
//-------------------

const darkMaterial = new THREE.MeshBasicMaterial({ color: "black" });
const materials = {};

let raycasterTarget;
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

window.addEventListener("mousemove", event => {
	// if(raycasterTarget) sceneParameters.container.style.cursor = "pointer";
	// else sceneParameters.container.style.cursor = "auto";
	pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
	pointer.y = - (event.clientY / window.innerHeight) * 2 + 1;
});

window.addEventListener("click", event => {
	if(!raycasterTarget) return;
	console.log(raycasterTarget.position.y / 10);
});

(function animate() {
	requestAnimationFrame(animate);
	scene.traverse(object => {
		if (object.isMesh && bloomLayer.test( object.layers ) === false) {
			materials[ object.uuid ] = object.material;
			object.material = darkMaterial;
		}
	});
	bloomComposer.render();
	scene.traverse(object => {
		if ( materials[object.uuid] ) {
			object.material = materials[object.uuid];
			delete materials[object.uuid];
		}
	});
	finalComposer.render();
	controls.update();

	raycaster.setFromCamera(pointer, camera);
	const intersects = raycaster.intersectObjects(intersectsGroup.children);
	if(intersects.length > 0) {
		const target = intersects[0].object;
		// const target = intersects[0].object.name;
		// console.log(target)
		if(target) raycasterTarget = target;
		else raycasterTarget = null;
	}

})();

sceneParameters.container.appendChild(renderer.domElement);