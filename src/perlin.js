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
};
