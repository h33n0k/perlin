// export default (width, height) => {
// 	// Créer une grille de bruit aléatoire
// 	const grid = new Array(width);
// 	for(let x = 0; x < grid.length; x++) {
// 		grid[x] = new Array(height);
// 		for(let y = 0; y < height; y++) grid[x][y] = Math.random();
// 	}

// 	// Interpolation bilinéaire
// 	const lerp = (a, b, t) => (1 - t) * a + t * b;

// 	// Génère une valeur de bruit à une position donnée
// 	const getValue = (x, y) => {
// 		// Calculez les quatre coins de la cellule de grille
// 		let x0 = Math.floor(x);
// 		let x1 = x0 + 1;
// 		let y0 = Math.floor(y);
// 		let y1 = y0 + 1;

// 		// Vérifiez si les coins de la cellule de grille sont définis
// 		if (x1 >= width) x1 = 0;
// 		if (y1 >= height) y1 = 0;

// 		// Interpolez les valeurs de bruit de chaque coin
// 		let sx = x - x0;
// 		let sy = y - y0;
// 		let n0 = grid[x0][y0];
// 		let n1 = grid[x1][y0];
// 		let ix0 = lerp(n0, n1, sx);
// 		// let n0 = grid[x0][y1];
// 		// let n1 = grid[x1][y1];
// 		let ix1 = lerp(n0, n1, sx);
// 		let value = lerp(ix0, ix1, sy);
// 		return value;
// 	}

// 	// Génère un tableau 2D de valeurs de bruit
// 	let noise = new Array(width);
// 	for(let x = 0; x < noise.length; x++) {
// 		noise[x] = new Array(height);
// 		for(let y = 0; y < height; y++) noise[x][y] = getValue(x, y);
// 	}

// 	return noise;
// };

import {
	Noise
} from "noisejs";

export default (width, height) => {
	const noise = new Noise(Math.random());
	return new Array(width)
		.fill(0)
		.map((xE, x) => {
			return new Array(height)
				.fill(0)
				.map((yE, y) => noise.perlin2(x / 10, y / 10));
		});
	// for (let x = 0; x < width; x++) {
	// 	for (let y = 0; y < height; y++) {
	// const value = noise.perlin2(x / 10, y / 10);
	// // utiliser la valeur de bruit pour dessiner ou créer des effets
	// }
	// }
};