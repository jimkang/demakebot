var Jimp = require('jimp');
var probable = require('probable');

function demakeImage(opts, done) {
  var buffer;
  var width;
  var height;

  if (opts) {
    buffer = opts.buffer;
    width = opts.width;
    height = opts.height;
  }

  // If there's no dimensions, just guess.
  if (!width) {
    width = 640;
  }
  if (!height) {
    height = 640;
  }

  Jimp.read(buffer, manipulateImage);

  function manipulateImage(error, image) {
    if (error) {
      done(error);
    }
    else {
      var scaleDownSize;

      if (probable.roll(20) === 0) {
        scaleDownSize = probable.roll(4) === 0 ? 4 : 8;
      }
      else {
        var largestOriginalDimension = width;
        if (largestOriginalDimension < height) {
          largestOriginalDimension = height;
        }
        var nearestPowerOf2 = ~~(Math.log2(largestOriginalDimension));
        var exponent = Math.round(nearestPowerOf2 * 2/3);

        if (exponent < 2) {
          exponent = 2;
        }
        scaleDownSize = Math.pow(2, exponent);
      }

      console.log('width', width, 'height', height, 'scaleDownSize', scaleDownSize);

      image.scaleToFit(scaleDownSize, scaleDownSize, Jimp.RESIZE_NEAREST_NEIGHBOR);
      image.scaleToFit(640, 640, Jimp.RESIZE_NEAREST_NEIGHBOR);
      image.getBuffer(Jimp.MIME_PNG, done);
    }
  }
}

module.exports = demakeImage;