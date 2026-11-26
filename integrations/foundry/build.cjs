const path = require('path');
const webpack = require('webpack');
process.env.NODE_ENV = 'production';
webpack({
  mode: 'production', devtool: false,
  entry: path.join(__dirname, 'engine-entry.js'),
  experiments: { outputModule: true },
  output: { path: path.join(__dirname, 'noma-roguelite/scripts'), filename: 'rules.mjs', library: { type: 'module' } },
  resolve: { extensions: ['.js', '.jsx'] },
  module: { rules: [{ test: /\.[jt]sx?$/, exclude: /node_modules/, use: { loader: 'babel-loader', options: { presets: ['babel-preset-react-app'] } } }] },
  optimization: { minimize: false },
}, (error, stats) => {
  if (error || stats.hasErrors()) { console.error(error || stats.toString('errors-only')); process.exitCode = 1; }
  else console.log('Reglas de NOMA exportadas a Foundry.');
});
