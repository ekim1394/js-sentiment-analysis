var port = (process.env.VCAP_APP_PORT || 3000);
var express = require("express");
var sentiment = require("sentiment");
var twitter = require("ntwitter");

var tweeter = new twitter({
    consumer_key: 'R9mXQvCVJYBFzkuDMZcOMq48E',
    consumer_secret: 'AIgj39JVO4zTb6ABuPSKoDgEkA3siIoojT3UJSKUHDELgyWz5N',
    access_token_key: '3226604096-48ZfN5LenZBgJXEEpZwzMC1VUz8VHwapWkMM436',
    access_token_secret: 'huNojQ1e1dUcaqy0mTKZdbMzrPmbUINqlj8vr86EAdIYi'
  });

  var app = express()

app.get('/hello', (req, res) => res.send('Hello World'));

app.get('/testSentiment', function (req,res) {
    var response = "<head>" +
    "<title>Twitter Sentiment Analysis</title>\n" +
    "</head>\n" +
    "<body>\n" +
    "<p>Welcome to the Twitter Sentiment Analysis app.  What phrase would you like to analzye?\n</p>\n" +
    "<form action=\"/testSentiment\" method=\"get\">\n" +
    "<p>\nEnter a phrase to evaluate: <INPUT type=\"text\" name=\"phrase\"><BR>\n" +
    "<INPUT type=\"submit\" value=\"Send\">\n" +
    "</p>\n" +
    "</form>\n" +
    "</body>";
    
    var phrase = req.query.phrase;
    if(!phrase) {
        res.send(response);
    } else {
        sentiment(phrase, function(err, result) {
            response = 'sentiment(' + phrase + ') === ' + result.score;
            res.send(response);
        })
    }
});

app.get('/twitterCheck', function(req, res) {
    tweeter.verifyCredentials(function(error, data) {
        res.send('Hello, ' + data.name + '. I am in your twitters.')
    });
});

app.get('/watchTwitter', function(req, res) {
    var stream;
    var testTweetCount = 0 ;
    var phrase = 'trump';
    tweeter.verifyCredentials(function(error, data) {
        if(error) {
            res.send("Error connecting to Twitter: " + error);
        }
        stream = tweeter.stream('statuses/filter', {'track': phrase}, function(stream) {
            res.send("Monitoring Twitter for \'" + phrase + "\'... Logging Twitter Traffic");
            stream.on('data', function(data) { 
                testTweetCount++;
                if (testTweetCount % 50 === 0) {
                    console.log('Tweet #' + testTweetCount + ': ' + data.text);
                }
            });
        });
    });
});

var tweetCount = 0;
var tweetTotalSentiment = 0;
var monitoringPhrase;

function resetMonitoring() {
    monitoringPhrase = "";
}

function beginMonitoringPhrase(phrase) {
    var stream;
    if(monitoringPhrase) {
        resetMonitoring();
    }
    monitoringPhrase = phrase;
    tweetCount = 0;
    tweetTotalSentiment = 0;
    tweeter.verifyCredentials(function(error, data) {
        if (error) {
            return "Error connecting to Twitter: " + error;
        } else {
            stream = tweeter.stream('statuses/filter' , {'track': monitoringPhrase}, function(stream) {
                console.log('Monitoring Twitter for ' + monitoringPhrase);
                stream.on('data', function(data) {
                    if (data.lang === 'en') {
                        sentiment(data.text, function(err, res) {
                            tweetCount++;
                            if (tweetCount % 500 === 0) {
                                console.log('Tweet #' + tweetCount + ': ' + data.text);
                                console.log("Sentiment Score Results: ");
                                console.log(res);
                            }
                            tweetTotalSentiment += res.score;
                        });
                    }
                });
            });
            return stream;
        }
    });
}

function sentimentImage() {
    var avg = tweetTotalSentiment / tweetCount;
    console.log("Average Sentiment Score: " + avg);
    if (avg < 0.5) {
        return "bad"; 
    } else {
        return "good";
    }
}

app.get('/', function(req, res) {
    var welcomeResponse = "<HEAD>" +
    "<title>Twitter Sentiment Analysis</title>\n" +
    "</HEAD>\n" +
    "<BODY>\n" +
    "<P>\n" +
    "Welcome to the Twitter Sentiment Analysis app.<br>\n" + 
    "What would you like to monitor?\n" +
    "</P>\n" +
    "<FORM action=\"/monitor\" method=\"get\">\n" +
    "<P>\n" +
    "<INPUT type=\"text\" name=\"phrase\"><br><br>\n" +
    "<INPUT type=\"submit\" value=\"Go\">\n" +
    "</P>\n" + "</FORM>\n" + "</BODY>";
    if (!monitoringPhrase) {
        res.send(welcomeResponse)
    } else {
        console.log(sentimentImage());
        var monitoringResponse = "<HEAD>" +
        "<META http-equiv=\"refresh\" content=\"5; URL=http://" +
        req.headers.host +
        "/\">\n" +
        "<title>Twitter Sentiment Analysis</title>\n" +
        "</HEAD>\n" +
        "<BODY>\n" +
        "<P>\n" +
        "The Twittersphere is feeling " +
         + sentimentImage().toString() +
        " about " + monitoringPhrase + ".<br><br>" +
        "Analyzed " + tweetCount + " tweets...<br>" +
        "</P>\n" +
        "<A href=\"/reset\">Monitor another phrase</A>\n" +
        "</BODY>";
        res.send(monitoringResponse);
    }
});

app.get('/monitor', function(req, res) {
    console.log(req.query.phrase);
    beginMonitoringPhrase(req.query.phrase)
})

app.get('/reset', function(req,res) {
    resetMonitoring();
})
app.listen(port);
console.log("Server listening on port " + port);