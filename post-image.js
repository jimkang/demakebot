/* global process */

var clone = require('lodash.clone');
var fs = require('fs');
var postImageToTwitter = require('post-image-to-twitter');
var config = require('./config');
var queue = require('d3-queue').queue;
var randomId = require('idmaker').randomId;
var StaticWebArchiveOnGit = require('static-web-archive-on-git');

var staticWebStream = StaticWebArchiveOnGit({
  config: config.github,
  title: config.archiveName,
  footerScript: `<script type="text/javascript">
  (function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){
  (i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
  })(window,document,'script','//www.google-analytics.com/analytics.js','ga');

  ga('create', 'UA-49491163-1', 'jimkang.com');
  ga('send', 'pageview');
</script>`,
  maxEntriesPerPage: 20
});

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
      const filename =
        'image-output/would-have-posted-' +
        new Date().toISOString().replace(/:/g, '-') +
        '.png';
      console.log('Writing out', filename, 'for altText:', createOpts.altText);
      fs.writeFileSync(filename, buffer);
      process.exit();
    } else {
      var q = queue();
      q.defer(postImageToTwitter, postImageOpts);
      q.defer(postToArchive, buffer);
      q.await(done);
    }
  }

  function postToArchive(buffer, done) {
    var id = 'demake-' + randomId(8);
    staticWebStream.write({
      id,
      date: new Date().toISOString(),
      mediaFilename: id + '.png',
      caption: createOpts.caption,
      buffer
    });
    staticWebStream.end(done);
  }
}

module.exports = PostImage;
