/**
 * Created by huahaitao on 18/1/24.
 */
var path = require('path');
var CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
  entry: {
    index: ['./src/observer/observer.js'],
    dist: ['./example/index.js']
  },
  output: {
    path: path.join(__dirname, '/dist'),
    filename: '[name].js'
  },
  module: {
    // preLoaders: [
    //   {
    //     test: /\.js$/,
    //     loader: "eslint-loader",
    //     exclude: /node_modules/
    //   }
    // ],
    loaders: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        loader: 'babel'
      }
    ]
  },
  plugins: [new CopyWebpackPlugin([{ from: './example/index.html' }], {})]
};
