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

const url = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: ['https://www.googleapis.com/auth/photoslibrary.readonly']
});

module.exports = {
  setup : function(req, res) {
    res.send("Hi");
  },


  done : function(req, res) {
    res.send("Hi, and Done");
  },


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
