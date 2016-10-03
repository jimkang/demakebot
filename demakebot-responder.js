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
var betterKnowATweet = require('better-know-a-tweet');

var username = behavior.twitterUsername;

var dryRun = false;
if (process.argv.length > 2) {
  dryRun = (process.argv[2].toLowerCase() == '--dry');
}

var kit = ReplyDecisionKit({
  username: behavior.twitterUsername,
  kitDbPath: __dirname + '/data/demakebot-replies.db',
  secondsToWaitBetweenRepliesToSameUser: behavior.secondsToWaitBetweenRepliesToSameUser,
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
  waterfall(
    [
      passTweet,
      kit.shouldReplyToTweet,
      tweetMentionsSelfOrIsFromChimeInListMember,
      passTweet,
      composeDemakebotReply,
      postTweet,
      recordIncomingWasRepliedTo
    ],
    wrapUp
  );

  function passTweet(done) {
    callNextTick(done, null, incomingTweet);
  }

  function tweetMentionsSelfOrIsFromChimeInListMember(done) {
    if (doesTweetMentionBot(incomingTweet) ||
      behavior.chimeInUsers
        .indexOf(incomingTweet.user.screen_name.toLowerCase()) !== -1) {

      callNextTick(done);
    }
    else {
      callNextTick(
        done, new Error('Tweet does not mention self and is not from a chime-in user.')
      );
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

function doesTweetMentionBot(tweet) {
  var usernames = betterKnowATweet.whosInTheTweet(tweet).map(lowerCase);
  return usernames && usernames.indexOf(username.toLowerCase()) !== -1;
}

function lowerCase(s) {
  return s.toLowerCase();
}

function logError(error) {
  console.log(error);
}
