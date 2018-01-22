var randomApod = require('random-apod');
var request = require('request');

function getRandomApodImage(done) {
  var imageInfo = randomApod();
  var reqOpts = {
    method: 'GET',
    url: imageInfo.image,
    encoding: null
  };
  request(reqOpts, packageImage);

  function packageImage(error, res) {
    if (error) {
      done(error);
    } else {
      var imagePackage = {
        concept: imageInfo.title,
        imgurl: imageInfo.image,
        response: res
      };
      done(null, imagePackage);
    }
  }
}

module.exports = getRandomApodImage;
