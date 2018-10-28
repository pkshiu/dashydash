'use strict';

/*
  Good references to figure out how to use the google photo API in express and googleapi module:

  https://github.com/googlesamples/google-photos/blob/master/REST/PhotoFrame/app.js
  https://medium.com/@jackrobertscott/how-to-use-google-auth-api-with-node-js-888304f7e3a0
  https://developers.google.com/photos/library/guides/list  
*/

var request = require('request');
const { google } = require('googleapis');

var config = require('./secrets.json').pics;

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

    // console.log(req.query);
    if (req.query.code)
    {
    oauth2Client.getToken(req.query.code).then(
      function(result) {
        //tokens.refresh_token();
        oauth2Client.setCredentials(result.tokens);
        // Save in global
        config.token = result.tokens.access_token;
    });
  };
    res.send('Hi, and Done. <a href="/google/albums/">list albums</a>');
};




function listAlbums(req, res) {

  console.log('listing albums...');
  console.log(config.token);
  request({
    url: 'https://photoslibrary.googleapis.com/v1/albums',
    headers: {'Content-Type': 'application/json'},
    qs: {pageSize: 50},
    json: true,
    auth: {'bearer': config.token},
  }, function(error, r, body) {

    console.log(body);
    const s = body.albums.map(function(v) {
      return `<li><a href="/google/albums/${v.id}">${v.title}</a></li>`;
    }).join();

    res.send('<ul>' + s + '</ul>');
  });
};



function downloadAlbum(req, res) {
  console.log('download album...');
  console.log(req.query);
  request.post({
    url: 'https://photoslibrary.googleapis.com/v1/mediaItems:search',
    headers: {'Content-Type': 'application/json'},
    qs: {pageSize: 50, albumId: req.query.albumId},
    json: true,
    auth: {'bearer': config.token},
  }, function(error, r, body) {
    console.log(body);
    const s = body.mediaItems.map(function(v) {
      return `<li><a href="/google/albums/${v.id}">${v.filename}</a></li>`;
    }).join();

    res.send('<ul>' + s + '</ul>');
  });

};

module.exports = {

  addRoutes: function(router) {
    router.get('/google/setup/', setup);
    router.get('/google/done/', done);
    router.get('/google/albums/', listAlbums);
    router.get('/google/albums/:albumId', downloadAlbum);
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
