#!/usr/bin/env node
/* global process __dirname */

var config = require('./config');
var callNextTick = require('call-next-tick');
var Twit = require('twit');
var waterfall = require('async').waterfall;
var behavior = require('./behavior');
var composeDemakebotReply = require('./compose-demakebot-reply');
var ReplyDecisionKit = require('reply-decision-kit');
var PostImage = require('./post-image');
var curry = require('lodash.curry');

var dryRun = false;
if (process.argv.length > 2) {
  dryRun = (process.argv[2].toLowerCase() == '--dry');
}

var defaultKit = ReplyDecisionKit({
  username: behavior.twitterUsername,
  kitDbPath: __dirname + '/data/demakebot-replies.db',
  secondsToWaitBetweenRepliesToSameUser: behavior.secondsToWaitBetweenRepliesToSameUser,
  mustMentionSelf: true,
  alwaysRespondToMentionsFrom: 'deathmtn'
});

var chimeInKit = ReplyDecisionKit({
  username: behavior.twitterUsername,
  kitDbPath: __dirname + '/data/demakebot-chimeins.db',
  secondsToWaitBetweenRepliesToSameUser: behavior.hoursToWaitBetweenChimeIns * 3600,
  mustMentionSelf: false
});

var twit = new Twit(config.twitter);
var streamOpts = {
  replies: 'all',
  track: behavior.twitterUsername
};
var stream = twit.stream('user', streamOpts);

stream.on('tweet', respondToTweet);
stream.on('error', logError);

function respondToTweet(incomingTweet) {
  var prefix;
  var kit;

  waterfall(
    [
      passTweet,
      shouldReplyToTweet,
      passTweet,
      curry(composeDemakebotReply)(prefix),
      postTweet,
      recordIncomingWasRepliedTo
    ],
    wrapUp
  );

  function passTweet(done) {
    callNextTick(done, null, incomingTweet);
  }

  function shouldReplyToTweet(tweet, done) {
    defaultKit.shouldReplyToTweet(tweet, checkDefaultAnswer);

    function checkDefaultAnswer(error) {
      if (error) {
        // See if we should reply, chime-in-style.
        if (behavior.chimeInUsers.indexOf(incomingTweet.user.screen_name.toLowerCase()) !== -1) {
          prefix = undefined;
          chimeInKit.shouldReplyToTweet(tweet, done);
        }
        else {
          kit = chimeInKit;
          callNextTick(done, error);
        }
      }
      else {
        kit = defaultKit;
        done();
      }
    }
  }

  function postTweet(content, done) {
    if (content.image) {
      var postImage = PostImage({
        twit: twit,
        dryRun: dryRun,
        altText: incomingTweet.text,
        caption: content.text
      });
      postImage(content.image, done);
    }
    else {
      postTextTweet(content.text, done);
    }
  }

  function postTextTweet(text, done) {
    if (dryRun) {
      console.log('Would have tweeted:', text);
      var mockTweetData = {
        user: {
          id_str: 'mockuser',
        }
      };
      callNextTick(done, null, mockTweetData);
    }
    else {
      var body = {
        status: text,
        in_reply_to_status_id: incomingTweet.id_str
      };
      twit.post('statuses/update', body, done);
    }
  }

  function recordIncomingWasRepliedTo(postedTweetData, done) {
    kit.recordThatReplyHappened(incomingTweet, done);
  }  
}

function wrapUp(error, data) {
  if (error) {
    console.log(error);

    if (data) {
      console.log('data:', data);
    }
  }
}

function logError(error) {
  console.log(error);
}
