'use strict';
var request = require('request');
const { google } = require('googleapis');

const config = require('./secrets.json').pics;

const redirectURL = 'http://localhost:3000/google/done';

const oauth2Client = new google.auth.OAuth2(
  config.clientId,
  config.clientSecret,
  redirectURL
  );

const googleUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: ['https://www.googleapis.com/auth/photoslibrary.readonly']
});




function setup(req, res) {
    res.send(`Hi, <a href="${googleUrl}">Login with Google</a>`);
};


function done(req, res) {

    console.log(req.query);
    if (req.query.code)
    {
    oauth2Client.getToken(req.query.code).then(
      function(tokens) {
      console.log(tokens);
      oauth2Client.setCredentials(tokens);
      config.token = tokens;
    });
  };
    res.send('Hi, and Done. <a href="/google/albums/">list albums</a>');
};



function listAlbums(req, res) {
  console.log('listing albums...');
  request({
    url: 'https://photoslibrary.googleapis.com/v1/albums',
    headers: {'Content-Type': 'application/json'},
    qs: {pageSize: 20},
    json: true,
    auth: {'bearer': config.token},
  }, function(error, r, body) {
    console.log(error);
    console.log(r);
    res.set('Content-Type', 'text/xml');
    res.send(body);
  });
};


module.exports = {

  addRoutes: function(router) {
    router.get('/google/setup/', setup);
    router.get('/google/done/', done);
    router.get('/google/albums/', listAlbums);
  },

  setup : setup,
  done : done,
  listAlbums : listAlbums,

  ServerFetcher : function(m) {
    this.fetch = function(req, res) {
      if (m.fetch) {
        m.fetch(req, res);
      }
      else
      {
        request.get({
          url : m.url,
          json : true
        },
        function(err, httpResponse, body) {
          if (err) {
            console.log(err);
            res.end();
          }
          else {
            if (m.transform) {
              body = m.transform(body);
            }
            res.json(body);
          }
        });
      }
    }
    return this;
  }
}
