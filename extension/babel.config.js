module.exports = {
  presets: [
    "@babel/preset-react",
    ["@babel/preset-env", { targets: { node: "current" } }],
    "@babel/preset-typescript",
    "@emotion/babel-preset-css-prop"
  ],
  plugins: [
    "react-hot-loader/babel",
    ["@babel/plugin-proposal-decorators", { "legacy": true }],
  ]
}