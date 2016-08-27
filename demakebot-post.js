/* global process */
var Twit = require('twit');
var callNextTick = require('call-next-tick');
var config = require('./config');
var createWordnok = require('wordnok').createWordnok;
var getImageFromConcepts = require('./get-image-from-concepts');
var demakeImage = require('./demake-image');
var async = require('async');
var probable = require('probable');
var getRandomApodImage = require('./get-random-apod-image');
var PostImage = require('./post-image');

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

  var tasks;
  var commonTasks = [
    unpackImagePackage,
    demakeImage,
    post
  ];

  if (probable.roll(8) === 0) {
    tasks = [getRandomApodImage].concat(commonTasks);
  }
  else {
    tasks = [getConcepts, getImageFromConcepts].concat(commonTasks);
  }

  async.waterfall(tasks, wrapUp);

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

  function post(buffer, done) {
    PostImage({
      twit: twit,
      dryRun: dryRun,
      altText: concept,
      caption: concept
    })(buffer, done);
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
