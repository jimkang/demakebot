var demakeImage = require('./demake-image');
var async = require('async');
var request = require('request');
var callNextTick = require('call-next-tick');

function composeDemakeBotReply(incomingTweet, outerDone) {
  if (incomingTweet.entities.media && incomingTweet.entities.media.length > 0) {
    var medium = incomingTweet.entities.media[0];
    var mediaURL = medium.media_url;
    var width = 640;
    var height = 480;

    if (medium.sizes.thumb) {
      mediaURL += ':thumb';
      width = medium.sizes.thumb.w;
      height = medium.sizes.thumb.h;
    }
    else if (medium.sizes.medium) {
      width = medium.sizes.medium.w;
      height = medium.sizes.medium.h;
    }

    var imageReplyOpts = {
      incomingTweet: incomingTweet,
      mediaURL: mediaURL,
      width: width,
      height: height
    };    
    composeDemakeBotImageReply(imageReplyOpts, outerDone);
  }
  else {
    // TODO.
    // callNextTick(outerDone, null, {text:  '@' +  incomingTweet.user.screen_name + ' Hey!'});
    callNextTick(outerDone, new Error('TODO'));
  }
}

function composeDemakeBotImageReply(opts, outerDone) {
  var mediaURL;
  var width;
  var height;
  var incomingTweet;

  if (opts) {
    mediaURL = opts.mediaURL;
    width = opts.width;
    height = opts.height;
    incomingTweet = opts.incomingTweet;
  }

  async.waterfall(
    [
      getImage,
      makeDemakeOptsFromResponse,
      demakeImage,
      passTweetContent
    ],
    outerDone
  );

  function getImage(done) {
    var reqOpts = {
      url: mediaURL,
      encoding: null
    };
    request(reqOpts, done);
  }

  function makeDemakeOptsFromResponse(res, body, done) {
    var demakeOpts = {
      buffer: body,
      width: width,
      height: height
    };
    callNextTick(done, null, demakeOpts);
  }

  function passTweetContent(buffer, done) {
    var content = {
      text: '@' +  incomingTweet.user.screen_name,
      image: buffer
    };
    callNextTick(done, null, content);
  }
}

module.exports = composeDemakeBotReply;
