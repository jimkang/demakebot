var gis = require('g-i-s');
var async = require('async');
var probable = require('probable');
var pickFirstGoodURL = require('pick-first-good-url');
var callNextTick = require('call-next-tick');
var pluck = require('lodash.pluck');
var findWhere = require('lodash.findwhere');
var behavior = require('./behavior');
var pathExists = require('object-path-exists');

var skipDomains = [
  'deviantart.net',
  'deviantart.com',
  'tumblr.com',
  'acronymsandslang.com',
  'bigcommerce.com'
];

function getImageFromConcepts(concepts, allDone) {
  var result;
  async.someSeries(concepts, searchGIS, passResult);

  function searchGIS(concept, done) {
    var gisOpts = {
      searchTerm: concept
    };

    if (probable.roll(2) === 0) {
      gisOpts.searchTerm += ' art';
    }

    var tbsValues = [];

    if (probable.roll(4) > 0) {
      // Try to reduce the amount of text-in-image results.
      tbsValues.push('itp:photo');
    }
    if (probable.roll(10) > 0) {
      // Mostly, let's stick to color images.
      tbsValues.push('ic:color');
    }

    if (tbsValues.length > 0) {
      gisOpts.queryStringAddition = '&tbs=' + tbsValues.join(',');
    }

    gis(gisOpts, checkGISResults);

    function checkGISResults(error, results) {
      if (error) {
        done(error, false);
      }
      else if (results.length < 1) {
        done(null, false);
      }
      else {
        var imageResults = probable.shuffle(
          results.slice(0, behavior.numberOfImageResultToConsider)
        );
        var pickOpts = {
          urls: pluck(imageResults, 'url').filter(domainIsOK),
          responseChecker: isImageMIMEType,
          encoding: null
        };

        pickFirstGoodURL(pickOpts, saveGoodImage);        
      }

      function saveGoodImage(error, goodURL, goodResponse) {
        if (error) {
          done(error);
        }
        else if (!goodURL) {
          done(null, false);
        }
        else {
          var goodGISResult = findWhere(imageResults, {url: goodURL});
          result = {
            concept: concept,
            imgurl: goodURL,
            response: goodResponse,
            width: goodGISResult.width,
            height: goodGISResult.height
          };
          done(null, true);
        }
      }
    }
  }

  function passResult(error, found) {
    if (error) {
      allDone(error);
    }
    else if (!found) {
      allDone(new Error('Could not find image for concepts.'));
    }
    else {
      allDone(null, result);
    }
  }
}

function isImageMIMEType(response, done) {
  if (pathExists(response, ['headers', 'content-type'])) {
    var isOKType = false;
    var contentType = response.headers['content-type'];
    if (contentType.indexOf('image/') === 0 && contentType !== 'image/gif') {
      isOKType = true;
    }
    callNextTick(done, null, isOKType);
  }
  else {
    callNextTick(done, null, false);
  }
}

function domainIsOK(url) {
  return skipDomains.every(skipDomainIsNotInURL);

  function skipDomainIsNotInURL(skipDomain) {
    return url.indexOf(skipDomain) === -1;
  }
}

module.exports = getImageFromConcepts;
