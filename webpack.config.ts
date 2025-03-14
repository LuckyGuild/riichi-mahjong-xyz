import { resolve } from 'path';
import CopyWebpackPlugin from 'copy-webpack-plugin';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import MiniCssExtractPlugin from 'mini-css-extract-plugin';
import type { Configuration } from 'webpack';
import { GenerateSW } from 'workbox-webpack-plugin';

const NODE_ENV =
  process.env.NODE_ENV === 'production' ? 'production' : 'development';
const distPath = resolve(__dirname, 'dist');

const config: Configuration = {
  mode: NODE_ENV,
  entry: resolve(__dirname, 'src', 'index.tsx'),
  output: {
    path: distPath,
    filename: 'bundle.js'

  },
  module: {
    rules: [
      {
        // The TypeScript rule, with transpileOnly enabled:
        test: /\.tsx?$/,
        use: [
          {
            loader: 'ts-loader',
            options: {
              transpileOnly: true,
            },
          },
        ],
      },
      {
        test: /\.svg$/,
        use: [
          {
            loader: '@svgr/webpack',
            options: {
              svgo: {
                plugins: [{ removeViewBox: false }],
              },
            },
          },
        ],
      },
      {
        test: /\.css$/,
        use: [
          MiniCssExtractPlugin.loader,
          'css-loader',
          {
            loader: 'postcss-loader',
            options: {
              postcssOptions: {
                plugins: {
                  tailwindcss: {},
                  autoprefixer: {},
                  ...(NODE_ENV === 'production' ? { cssnano: {} } : {}),
                },
              },
            },
          },
        ],
      },
      {
        test: /\.ya?ml$/,
        use: 'yaml-loader',
      },
      {
        test: /\.wasm$/,
        type: 'webassembly/async',
      },
      {
        test: /\.(png|jpe?g|gif|ico)$/i,
        type: 'asset/resource',
        generator: {
          filename: 'assets/[name][ext]' // output images in /assets folder
        }
      },
    ],
  },

  resolve: {
    extensions: ['.js', '.jsx', '.ts', '.tsx']
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: resolve(__dirname, 'src', 'index.html'),
      filename: 'app.html'
    }),
    new CopyWebpackPlugin({
      patterns: [
        { from: 'resources', to: 'assets' },
        { from: 'public/assets', to: 'assets' },
        { from: 'public/home.html', to: 'home.html' },
        { from: 'public/about.html', to: 'about.html' },
        { from: 'public/style.css', to: 'style.css' }
      ]
    }),
    new MiniCssExtractPlugin(),
    ...(NODE_ENV === 'production'
      ? [
        new GenerateSW({
          swDest: resolve(distPath, 'sw.js'),
          skipWaiting: true,
          clientsClaim: true,
          cleanupOutdatedCaches: true
        })
      ]
      : []),
  ],
  devtool: NODE_ENV === 'development' ? 'inline-source-map' : false,
  experiments: {
    asyncWebAssembly: true,
    topLevelAwait: true
  }
};

export default config;
