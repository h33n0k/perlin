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
const boxSize = mesh => new THREE.Box3().setFromObject(mesh).getSize(new THREE.Vector3());
const hex2rgba = hexa => {
	let r = parseInt(hexa.slice(1,3), 16);
	let g = parseInt(hexa.slice(3,5), 16);
	let b = parseInt(hexa.slice(5,7), 16);
	let a = parseInt(hexa.slice(7,9), 16)/255;
	return `rgba(${r}, ${g}, ${b}, ${a})`;
}

const sceneParameters = {
	container: document.querySelector("#scene"),
	// imageContainer: document.querySelector("#graph-image"),
	// get imageContext() {
	// 	return this.imageContainer.getContext("2d");
	// },
	get width() {
		return this.container.offsetWidth;
	},
	get height() {
		return this.container.offsetHeight;
	}
};

// sceneParameters.imageContainer.width = sceneParameters.imageContainer.innerWidth;
// sceneParameters.imageContainer.height = sceneParameters.imageContainer.innerHeight;

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

camera.position.set(0, 50, -110);
const intersectsGroup = new THREE.Group();
scene.add(intersectsGroup);

const area = new THREE.Vector2(100, 100);

// (() => {
// 	const geometry = new THREE.PlaneGeometry(area.x, area.y);
// 	const material = new THREE.MeshBasicMaterial( {color: 0xffff00, side: THREE.DoubleSide} );
// 	const plane = new THREE.Mesh(geometry, material);
// 	plane.rotation.x = p2d(90);
// 	scene.add(plane);
// })();

let autoRefresh = true;
let lineColor = "#ff0000";
let [width, height] = [20, 20];
let coeff = 5;

const transition = .8;

let pointsArray = new Array();
let [prevWidth, prevHeight] = [width, height];
const setGraphs = async () => {

	const updatePositions = geo => geo.attributes.position.needsUpdate = true;
	const findY = (x, z) => {
		for(let i = 0; i < pointsArray.length; i++) {
			for(let j = 0; j < pointsArray[i].length; j++) {
				if(pointsArray[i][j].x === x && pointsArray[i][j].z === z) return pointsArray[i][j].y;
			};
		};
		return 0;
	};

	const getDivisions = (i, j) => {
		return {
			x: Math.floor(-(area.x / 2) + (area.x / (width)) * i),
			z: Math.floor(-(area.y / 2) + (area.y / (height)) * j)
		}
	};

	const findClosest = (axe, value) => {
		const r = array => array.map(p => p[axe]);
		const positions = new Array(width)
			.fill()
			.map((e, i) => new Array(height)
				.fill()
				.map((f, j) => getDivisions(i, j)))
			.reduce((current, accumulator) => {
				if(typeof current[0] !== "number") current = r(current);
				current = [...current, ...r(accumulator)];
				return current;
			});

		let distanceMin = Infinity;
		let indexMin = 0;
		for(let i = 0; i < positions.length; i++) {
			const distance = Math.abs(positions[i] - value);
			if(distance < distanceMin) {
				distanceMin = distance;
				indexMin = i;
			}
		}
		return positions[indexMin];
	};

	await new Promise(r => {
		Promise.all(intersectsGroup.children.map(child => new Promise(resolve => {
			switch(child.type) {
				case "Mesh":
					const position = {...child.position};
					gsap.to(position, {
						x: child.position.x,
						y: 0,
						z: child.position.z,
						duration: (transition / 2),
						onUpdate: () => child.position.setY(position.y),
						onComplete: () => resolve()
					});
					break;
				case "Line":
					const endArray = child.geometry.attributes.position.array.map((position, i) => (i % 3) === 1 ? 0 : position);

					gsap.to(child.geometry.attributes.position.array, {
						duration: (transition / 2),
						onUpdate: () => updatePositions(child.geometry),
						endArray,
						onComplete: () => resolve()
					});
					break;
				default:
					resolve();
					break;
			};
		}))).then(r);
	});

	if(prevWidth !== width || prevHeight !== height) {
		await new Promise(r => {
			Promise.all(intersectsGroup.children.map(child => new Promise(r2 => {
				switch(child.type) {
					case "Mesh":
						const position = {...child.position};
						gsap.to(position, {
							x: findClosest("x", child.position.x),
							y: child.position.y,
							z: findClosest("z", child.position.z),
							duration: (transition / 2),
							onUpdate: () => {
								child.position.setX(position.x);
								child.position.setZ(position.z);
							},
							onComplete: () => r2()
						});
						break;
					case "Line":
						const endArray = child.geometry.attributes.position.array.map((position, i) => {
							switch(i % 3) {
								case 0:
									return findClosest("x", position)
									break;
								case 2:
									return findClosest("z", position)
									break;
								default:
									return position;
									break;
							};
						});

						gsap.to(child.geometry.attributes.position.array, {
							duration: (transition / 2),
							onUpdate: () => updatePositions(child.geometry),
							endArray,
							onComplete: () => r2()
						});
						break;
					default:
						r2();
						break;
				};
			}))).then(r);
		});
	};

	intersectsGroup.remove(...intersectsGroup.children);
	// sceneParameters.imageContext.clearRect(0, 0, sceneParameters.imageContainer.offsetWidth, sceneParameters.imageContainer.offsetHeight);
	pointsArray = new Array();

	perlin(width, height).forEach((section, i) => {		

		const points = new Array();
		
		section.forEach((value, j) => {
			// // 2d graph
			// sceneParameters.imageContext.fillStyle = (j % 2) === 0 ? hex2rgba(lineColor + Math.floor(value * 100)) : "red";
			// sceneParameters.imageContext.fillRect(
			// 	((sceneParameters.imageContainer.offsetWidth / width) * i),
			// 	((sceneParameters.imageContainer.offsetHeight / height) * j),
			// 	sceneParameters.imageContainer.offsetWidth / width,
			// 	sceneParameters.imageContainer.offsetHeight / height
			// );

			// 3d graph
			const divisions = getDivisions(i, j);
			points.push(new THREE.Vector3(divisions.x, (value * coeff), divisions.z));
		});
		
		const geometry = new THREE.BufferGeometry().setFromPoints(points.map(p => {
			return {
				...p,
				y: 0
			}
		}));
		const material = new THREE.LineBasicMaterial({ color: new THREE.Color(lineColor) });
		const line = new THREE.Line(geometry, material);
		intersectsGroup.add(line);
		pointsArray.push(points);

		points.forEach(position => {
			const geometry = new THREE.SphereGeometry(.5, 32, 16);
			const material = new THREE.MeshBasicMaterial( { color: new THREE.Color(lineColor) } );
			const sphere = new THREE.Mesh(geometry, material);
			sphere.position.copy({...position, y: 0});
			intersectsGroup.add(sphere);
		});

	});

	new Array(height).fill().map((e, i) => {
		const array = new Array();
		for(let j = 0; j < pointsArray.length; j++) array.push(pointsArray[j][i]);
		return array;
	}).forEach(section => {
		const geometry = new THREE.BufferGeometry().setFromPoints(section.map(p => {
			return {
				...p,
				y: 0
			}
		}));
		const material = new THREE.LineBasicMaterial({ color: new THREE.Color(lineColor) });
		const line = new THREE.Line(geometry, material);
		intersectsGroup.add(line);
	});

	if(prevWidth !== width || prevHeight !== height) {
		await wait(100);
		await new Promise((resolve, reject) => {
			const position = {...intersectsGroup.position};
			gsap.to(position, {
				x: (area.x - boxSize(intersectsGroup).x) / 2,
				y: intersectsGroup.position.y,
				z: (area.y - boxSize(intersectsGroup).z) / 2,
				duration: (transition / 2),
				onUpdate: () => {
					intersectsGroup.position.setX(position.x);
					intersectsGroup.position.setZ(position.z);
				},
				onComplete: () => resolve()
			});
		});

	};

	await wait(100);

	await new Promise(r => {
		Promise.all(intersectsGroup.children.map(child => new Promise(resolve => {
			switch(child.type) {
				case "Mesh":
					const position = {...child.position, y: 0};
					gsap.to(position, {
						x: child.position.x,
						y: findY(child.position.x, child.position.z),
						z: child.position.z,
						duration: (transition / 2),
						onUpdate: () => child.position.setY(position.y),
						onComplete: () => resolve()
					});
					break;
				case "Line":

					const positionArray = [...child.geometry.attributes.position.array];
					const endArray = positionArray.map((value, i) => {
						if((i % 3) === 1) {
							return findY(positionArray[i - 1], positionArray[i + 1]);
						}
						return value;
					});

					gsap.to(child.geometry.attributes.position.array, {
						duration: (transition / 2),
						onUpdate: () => updatePositions(child.geometry),
						endArray: endArray,
					});
					resolve();
					break;
				default:
					resolve();
					break;
			};
		}))).then(r);
	});

	[prevWidth, prevHeight] = [width, height];
};

setGraphs(true);

// (async () => {
// 	width = 10;
// 	await setGraphs();
// 	width = 5;
// 	await setGraphs();
// 	// width = 30;
// 	// await setGraphs();
// })();

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

$("body").on("change mousemove", "#controls-width",function(event) {
	width = parseInt($(this).val());
	refreshValues();
});

$("body").on("change mousemove", "#controls-height",function(event) {
	height = parseInt($(this).val());
	refreshValues();
});

$("#controls-color").change(function(event) {
	lineColor = new THREE.Color($(this).val());
});

$("body").on("change mousemove", "#controls-coeff",function(event) {
	coeff = parseInt($(this).val());
	refreshValues();
});

$("#controls-auto_refresh").change(function(event) {
	autoRefresh = $(this).is(":checked");
});

$("#controls input").change(function(event) {
	$(`${$(this).attr("id")}-value`).text($(this).val());
	if(autoRefresh) setGraphs();
});

$("#controls-refresh").click(setGraphs);

//dev----------------
const controls = new OrbitControls(camera, renderer.domElement);
// controls.enablePan = false;
controls.enableZoom = false;
controls.autoRotateSpeed = 0.3;
controls.autoRotate = true;
//-------------------

const darkMaterial = new THREE.MeshBasicMaterial({ color: "black" });
const materials = {};

let raycasterTarget;
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

window.addEventListener("mousemove", event => {
	pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
	pointer.y = - (event.clientY / window.innerHeight) * 2 + 1;
	$("#raycaster").css({
		top: event.clientY + "px",
		left: event.clientX + "px"
	});
	if(raycasterTarget) {
		$("#raycaster").show().text(raycasterTarget.position.y);
		controls.autoRotate = false;
	} else {
		$("#raycaster").hide();
		controls.autoRotate = true;
	}
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
		if(target && target.type === "Mesh") raycasterTarget = target;
		else raycasterTarget = null;
	}

})();

sceneParameters.container.appendChild(renderer.domElement);