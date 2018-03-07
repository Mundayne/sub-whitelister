// Imports
// Modules
const express = require('express')
const session = require('express-session')
const passport = require('passport')
const OAuth2Strat = require('passport-oauth').OAuth2Strategy
const request = require('request')
const handlebars = require('handlebars')
// Other
const creds = require('./creds')

// Constants
const app = express()

// Init Express and middlewares
app.use(session({ secret: creds.session.secret, resave: false, saveUninitialized: false }))
app.use(express.static('public'))
app.use(passport.initialize())
app.use(passport.session())

// Get user profile from Twitch
OAuth2Strat.prototype.userProfile = (token, done) => {
  let options = {
    url: 'https://api.twitch.tv/kraken/user',
    method: 'GET',
    headers: {
      'Client-ID': creds.twitch.id,
      'Accept': 'application/vnd.twitchtv.v5+json',
      'Authorization': 'OAuth ' + token
    }
  }

  request(options, (err, res, body) => {
    if (err) console.error('Error getting user profile: ' + err)
    if (res && res.statusCode === 200) {
      done(null, JSON.parse(body))
    } else {
      done(JSON.parse(body))
    }
  })
}

passport.serializeUser((user, done) => {
  done(null, user)
})

passport.deserializeUser((user, done) => {
  done(null, user)
})

passport.use('twitch', new OAuth2Strat({
  authorizationURL: 'https://api.twitch.tv/kraken/oauth2/authorize',
  tokenURL: 'https://api.twitch.tv/kraken/oauth2/token',
  clientID: creds.twitch.id,
  clientSecret: creds.twitch.secret,
  callbackURL: creds.oauth_url,
  state: true
}, (accessToken, refreshToken, profile, done) => {
  profile.accessToken = accessToken
  profile.refreshToken = refreshToken
  // Store user info here
  done(null, profile)
}))

// Start OAuth link here
app.get('/auth/twitch', passport.authenticate('twitch', { scope: 'user_read' }))

// Route OAuth redirect back to sub-whitelist page
app.get('/auth/twitch/callback', passport.authenticate('twitch', { successRedirect: '/sub-whitelist', failureRedirect: '/sub-whitelist' }))

app.get('/sub-whitelist', (req, res) => {
  if (req.session && req.session.passport && req.session.passport.user) {
    // Logged in
    res.send(temp(req.sesion.passport.user))
  } else {
    res.send('<html><head><title>Sub Whitelister</title></head><body></body><a href="/auth/twitch"><img src="http://ttv-api.s3.amazonaws.com/assets/connect_dark.png"></a></html>')
  }
})

let temp = handlebars.compile(`
  <html>
    <head>
      <title>Sub Whitelister</title>
    </head>
    <body>
      <table>
      <tr><th>Access Token</th><td>{{accessToken}}</td></tr>
      <tr><th>Refresh Token</th><td>{{refreshToken}}</td></tr>
      <tr><th>Display Name</th><td>{{display_name}}</td></tr>
      <tr><th>Bio</th><td>{{bio}}</td></tr>
      <tr><th>Image</th><td>{{logo}}</td></tr>
      </table>
    </body>
  </html`)

// Listen
app.listen(3000, () => {
  console.log('listening 3000')
})
