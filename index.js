var express = require('express');
var passport = require('passport');
var session = require('express-session');
var TwitterStrategy = require('passport-twitter').Strategy;
var sqlite3 = require('sqlite3').verbose();

passport.serializeUser(function(user, done) {
	done(null, user);
});

passport.deserializeUser(function(obj, done) {
	done(null, obj);
});

var db = new sqlite3.Database('./tomorinao.db');
db.serialize(function() {
  db.run("CREATE TABLE if not exists TomoriNao (id INTEGER, username TEXT, displayName TEXT, icon TEXT)")
})

var app = express();
app.use(session({
	resave: false,
	saveUninitialized: true,
	secret: process.env.COOKIE_SECRET_KEY
}));

app.use(passport.initialize());
app.use(passport.session());

passport.use(new TwitterStrategy({
	consumerKey: process.env.TWITTER_CONSUMER_KEY,
	consumerSecret: process.env.TWITTER_CONSUMER_SECRET,
	callbackURL: "http://xn--kcrq3bq6ibn8b.jp/callback"
},
function(token, tokenSecret, profile, done) {
	if (!profile) { return; }
	if (profile.displayName.match(/友利奈緒/)) {
		db.serialize(function() {
			db.run("INSERT or REPLACE INTO TomoriNao (id, username, displayName, icon) VALUES (?, ?, ?, ?)",
				[ profile.id, profile.username, profile.displayName, profile.photos[0].value.replace('_normal','') ]);
		})
	} else {
		db.serialize(function() {
			db.run("DELETE FROM TomoriNao WHERE id=?", profile.id);
		})
	}
	return done(null, profile);
}));

app.get('/callback', passport.authenticate('twitter', { failureRedirect: '/' }), function(req, res) {
	res.redirect('/');
});

app.get('/list.json', function (req, res) {
	res.contentType('application/json');
	db.all("SELECT * FROM TomoriNao",function(err,rows){
		res.send(JSON.stringify(rows));
	});
});

app.get('/login', passport.authenticate('twitter', { failureRedirect: '/' }), function(req, res) {
	res.redirect('/');
});

var server = app.listen(3000, function () {
	console.log("started at " + new Date());
});
