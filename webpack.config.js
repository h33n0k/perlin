const path = require("path");

const mode = process.env.NODE_ENV === "production" ? "production" : "development"

module.exports = {
	mode,
	target: "web",
	devtool: "source-map",
	watch: mode === "development",
	entry: path.resolve(__dirname, "./src/index.js"),
	output: {
		path: path.resolve(__dirname, "./public/"),
		filename: "app.bundle.js"
	},
	module: {
		rules: [
			{
				test: /\.scss$/,
				exclude: /node_modules/,
				use: [
					"style-loader",
					"css-loader",
					"sass-loader"
				]
			}
		]
	}
};