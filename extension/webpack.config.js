var webpack = require('webpack'),
  path = require('path'),
  fileSystem = require('fs-extra'),
  env = require('./utils/env'),
  CopyWebpackPlugin = require('copy-webpack-plugin'),
  HtmlWebpackPlugin = require('html-webpack-plugin'),
  TerserPlugin = require('terser-webpack-plugin'),
  Dotenv = require('dotenv-webpack');
var { CleanWebpackPlugin } = require('clean-webpack-plugin');
var child_process = require('child_process');

const ASSET_PATH = process.env.ASSET_PATH || '/';

var alias = {};

// load the secrets
var secretsPath = path.join(__dirname, 'secrets.' + env.NODE_ENV + '.js');

var fileExtensions = [
  'jpg',
  'jpeg',
  'png',
  'gif',
  'eot',
  'otf',
  'svg',
  // 'ttf',
  // 'woff',
  // 'woff2',
];

if (fileSystem.existsSync(secretsPath)) {
  alias['secrets'] = secretsPath;
}

process.env.GIT_COMMIT_ID = child_process.execSync('git rev-parse --short HEAD').toString().trim()

var options = {
  mode: process.env.NODE_ENV || 'development',
  entry: {
    background: path.join(__dirname, 'src', 'background', 'index.ts'),
    popup: path.join(__dirname, 'src', 'popup', 'index.tsx'),
    contentScript: path.join(__dirname, 'src', 'content', 'index.ts'),
    debug: path.join(__dirname, 'src', 'content', 'debug.ts'),
    // @ppsreejith: We can generate this in the future, for now adding manually
    // Same in manifest.json file
    metabase: path.join(__dirname, '..', 'apps', 'src', 'metabase', 'inject.ts'),
    jupyter: path.join(__dirname, '..', 'apps', 'src', 'jupyter', 'inject.ts'),
    posthog: path.join(__dirname, '..', 'apps', 'src', 'posthog', 'inject.ts'),
  },
  chromeExtensionBoilerplate: {
    notHotReload: ['background', 'contentScript'],
  },
  output: {
    filename: '[name].bundle.js',
    path: path.resolve(__dirname, 'build'),
    clean: true,
    publicPath: ASSET_PATH,
  },
  module: {
    rules: [
      {
        // look for .css or .scss files
        test: /\.(css|scss)$/,
        // in the `src` directory
        use: [
          {
            loader: 'style-loader',
          },
          {
            loader: 'css-loader',
          },
          {
            loader: 'sass-loader',
            options: {
              sourceMap: true,
            },
          },
        ],
      },
      {
        test: new RegExp('.(' + fileExtensions.join('|') + ')$'),
        type: 'asset/resource',
        exclude: /node_modules/,
        // loader: 'file-loader',
        // options: {
        //   name: '[name].[ext]',
        // },
      },
      {
        test: /\.html$/,
        loader: 'html-loader',
        exclude: /node_modules/,
      },
      // { test: /\.(ts|tsx)$/, loader: 'babel-loader', exclude: /node_modules/ },
      {
        test: /\.(js|jsx|ts|tsx)$/,
        use: [
          {
            loader: 'source-map-loader',
          },
          {
            loader: 'babel-loader',
          },
        ],
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    alias: alias,
    extensions: fileExtensions
      .map((extension) => '.' + extension)
      .concat(['.js', '.jsx', '.ts', '.tsx', '.css']),
  },
  plugins: [
    new CleanWebpackPlugin({ verbose: false }),
    new webpack.ProgressPlugin(),
    // expose and write the allowed env vars on the compiled bundle
    new webpack.EnvironmentPlugin(['NODE_ENV', 'GIT_COMMIT_ID', 'npm_package_version']),
    new CopyWebpackPlugin({
      patterns: [
        {
          from: 'src/manifest.json',
          to: path.join(__dirname, 'build'),
          force: true,
          transform: function (content, path) {
            // generates the manifest file using the package.json informations
            return Buffer.from(
              JSON.stringify({
                description: process.env.npm_package_description,
                version: process.env.npm_package_version,
                ...JSON.parse(content.toString()),
              })
            );
          },
        },
      ],
    }),
    new CopyWebpackPlugin({
      patterns: [
        {
          from: 'src/content/content.styles.css',
          to: path.join(__dirname, 'build'),
          force: true,
        },
      ],
    }),
    new CopyWebpackPlugin({
      patterns: [
        {
          from: 'src/assets/img/icon-128.png',
          to: path.join(__dirname, 'build'),
          force: true,
        },
      ],
    }),
    new CopyWebpackPlugin({
      patterns: [
        {
          from: 'src/assets/img/icon-34.png',
          to: path.join(__dirname, 'build'),
          force: true,
        },
      ],
    }),
    new CopyWebpackPlugin({
      patterns: [
        {
          from: 'src/assets/img/logo.svg',
          to: path.join(__dirname, 'build'),
          force: true,
        },
      ],
    }),
    new CopyWebpackPlugin({
      patterns: [
        {
          from: 'src/assets/img/logo_x.svg',
          to: path.join(__dirname, 'build'),
          force: true,
        },
      ],
    }),
    new HtmlWebpackPlugin({
      template: path.join(__dirname, 'src', 'popup', 'index.html'),
      filename: 'popup.html',
      chunks: ['popup'],
      cache: false,
    }),
    new Dotenv({ path: path.resolve(__dirname, `.env.${env.NODE_ENV}`) }),
  ],
  infrastructureLogging: {
    level: 'info',
  },
  experiments: {
    asyncWebAssembly: true,
  },
};

if (env.NODE_ENV === 'development') {
  options.devtool = 'cheap-module-source-map';
} else {
  options.optimization = {
    minimize: true,
    minimizer: [
      new TerserPlugin({
        extractComments: false,
      }),
    ],
  };
}

module.exports = options;
