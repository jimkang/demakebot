/* global process */

var clone = require('lodash.clone');
var fs = require('fs');
var postImageToTwitter = require('post-image-to-twitter');

function PostImage(createOpts) {
  // createOpts should have:
  // var twit;
  // var dryRun;
  // var altText;
  // var caption;
  return postImage;

  function postImage(buffer, done) {
    var postImageOpts = clone(createOpts);
    postImageOpts.base64Image = buffer.toString('base64');

    if (createOpts.dryRun) {
      const filename = 'image-output/would-have-posted-' +
        (new Date()).toISOString().replace(/:/g, '-') +
        '.png';
      console.log('Writing out', filename, 'for altText:', createOpts.altText);
      fs.writeFileSync(filename, buffer);
      process.exit();
    }
    else {
      postImageToTwitter(postImageOpts, done);
    }
  }
}

module.exports = PostImage;
