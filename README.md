# Perlin Noise

## Origin and use of Perlin noise
Perlin noise is a noise generation technique developed by Ken Perlin in 1983. It helps generate consistent and realistic noise patterns, often used in computer graphics, 3D animation, video games, terrain simulation and many other fields. .

### Origin
Perlin noise is inspired by natural noise found in the real world. Ken Perlin wanted to reproduce this type of noise by using mathematical algorithms to generate noise patterns that were consistent and controllable.

### How it works ?
Perlin noise works by generating a grid of random vectors and calculating a linear interpolation between those vectors at every point in space. The result is a noise pattern that varies smoothly and gives a sense of continuity.

Perlin noise can be generated in one, two, or three dimensions, as needed. The higher the number of dimensions, the more complex and detailed the noise will be.

### Use
Perlin noise is very useful in many graphics applications.

## Steps:

1. Install [NodeJs](https://nodejs.org)

2. Clone the repo
```bash
git clone https://github.com/valentingorr/perlin.git
```

3. Install Dependencies
```bash
npm install --legacy-peer-deps
```

4. Build the bundle
```bash
npm run build
```

5. Open `public/index.html`
