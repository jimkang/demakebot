/* global process */
var Twit = require('twit');
var callNextTick = require('call-next-tick');
var fs = require('fs');
var config = require('./config');
var createWordnok = require('wordnok').createWordnok;
var getImageFromConcepts = require('./get-image-from-concepts');
var demakeImage = require('./demake-image');
var async = require('async');
var postImageToTwitter = require('post-image-to-twitter');

var dryRun = false;
var tryCount = 0;

if (process.argv.length > 2) {
  dryRun = (process.argv.indexOf('--dry') !== -1);
}

var twit = new Twit(config.twitter);

function go() {
  var concept;
  // var originalWidth;
  // var originalHeight;

  var wordnok = createWordnok({
    apiKey: config.wordnikAPIKey
  });

  async.waterfall(
    [
      getConcepts,
      getImageFromConcepts,
      unpackImagePackage,
      demakeImage,
      postImage
    ],
    wrapUp
  );

  function getConcepts(done) {
    var opts = {
      customParams: {
        limit: 5,
        minCorpusCount: 1000
      }
    };
    wordnok.getRandomWords(opts, done);
  }

  function unpackImagePackage(imagePackage, done) {
    concept = imagePackage.concept;
    console.log('Original image:', imagePackage.imgurl);

    var demakeOpts = {
      buffer: imagePackage.response.body,
      width: imagePackage.width,
      height: imagePackage.height
    };
    callNextTick(done, null, demakeOpts);
  }

  function postImage(buffer, done) {
    var postImageOpts = {
      twit: twit,
      dryRun: dryRun,
      base64Image: buffer.toString('base64'),
      altText: concept,
      caption: concept
    };

    if (dryRun) {
      const filename = 'image-output/would-have-posted-' +
        (new Date()).toISOString().replace(/:/g, '-') +
        '.png';
      console.log('Writing out', filename, 'for concept:', concept);
      fs.writeFileSync(filename, buffer);
      process.exit();
    }
    else {
      postImageToTwitter(postImageOpts, done);
    }
  }
}

function wrapUp(error, data) {
  tryCount += 1;

  if (error) {
    console.log(error, error.stack);

    if (data) {
      console.log('data:', data);
    }

    if (tryCount < 5) {
      console.log(tryCount, 'tries so far. Trying again!');
      callNextTick(go);
    }
    else {
      console.log('Hit max tries. Giving up.');
    }
  }
}

go();
