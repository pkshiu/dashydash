'use strict';

/*
  Good references to figure out how to use the google photo API in express and googleapi module:

  https://github.com/googlesamples/google-photos/blob/master/REST/PhotoFrame/app.js
  https://medium.com/@jackrobertscott/how-to-use-google-auth-api-with-node-js-888304f7e3a0
  https://developers.google.com/photos/library/guides/list  
*/

var request = require('request');
var fs = require('fs');
var path = require('path');
var appdb = require('./components/common/db.js').appdb();

const { google } = require('googleapis');

var config = require('./secrets.json').pics;

const redirectURL = 'http://localhost:3000/google/done';
const IMAGE_DIR = './dist/images/photos';

const oauth2Client = new google.auth.OAuth2(
  config.clientId,
  config.clientSecret,
  redirectURL
  );

// Note: google only ask user for approval of the permission if the previous approval
// has timed out. If user is not prompted, we will not get a refresh_token.
// So we force it here with approval_prompt=force
const googleUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  prompt: 'consent',
  scope: ['https://www.googleapis.com/auth/photoslibrary.readonly']
});


function save_tokens(tokens) {
  console.log('saving tokens:', tokens);
  if (!tokens) {
    return;
  }
  config.google_api = tokens;
  console.log(`token: ${config.google_api}`);
  appdb.update({ google_api: { $exists: true}}, { google_api: tokens},
    { upsert: true});
};


/*
  Use the previously stored special refresh_token to get a new access token
  TBW
*/
function refreshToken(tokens) {

  console.log('refreshing token...');
  oauth2Client.setCredentials(tokens);
  oauth2Client.refreshAccessToken().then(function(result) {
    console.log('token refreshed.');
    save_tokens(result.credentials);
    }, e => console.log(e));

};


function setup(req, res) {

    appdb.findOne({google_api: { $exists: true}},
      function(err, docs) {
        console.log('docs loaded:', docs);

        var s = `Hi, <a href="${googleUrl}">Login with Google</a>`;

        if (docs && docs.google_api) {
          config.google_api = docs.google_api;

          refreshToken(config.google_api);
          console.log(config.google_api);

          if (config.google_api.refresh_token) {
            s += 'but you do not need to...';
        };
      };
      res.send(s);
      })
};


function done(req, res) {

    console.log('Google OAuth called back...', req.query.code);
    if (req.query.code)
    {
    oauth2Client.getToken(req.query.code).then(
      function(result) {
        oauth2Client.setCredentials(result.tokens);
        // Save in global
        save_tokens(result.tokens);
    });
  };
    res.send('Hi, and Done. <a href="/google/albums/">list albums</a>');
};




function listAlbums(req, res) {

  console.log('listing albums...');
  console.log(config.google_api.access_token);
  request({
    url: 'https://photoslibrary.googleapis.com/v1/albums',
    headers: {'Content-Type': 'application/json'},
    qs: {pageSize: 50},
    json: true,
    auth: {'bearer': config.google_api.access_token},
  }, function(error, r, body) {

    // console.log(body);
    const s = body.albums.map(function(v) {
      return `<li><a href="/google/album/${v.id}">${v.title}</a></li>`;
    }).join();

    res.send('<ul>' + s + '</ul>');
  });
};



/*
  Get album content data from google API.
  Return promise to return array of google mediaItems
*/
function getAlbumData(albumId) {

  console.log(`get album data: ${albumId}...`);

  return new Promise(function(resolve, reject) {

  var req = request.post({
      url: 'https://photoslibrary.googleapis.com/v1/mediaItems:search',
      headers: {'Content-Type': 'application/json'},
      qs: {pageSize: 50, albumId: albumId},
      json: true,
      auth: {'bearer': config.google_api.access_token},
    }, function(err, r, body) {
      if (err)
        reject(err);

    console.log(body);
    resolve(body.mediaItems);
  });


  });
};


function listAlbumPhotos(req, res) {
  console.log('list photos in album...');
  console.log(req.params);
  getAlbumData(req.params.albumId).then(function(items) {
    const s = items.map(function(v) {
      return `<li><a href="/google/albums/${v.id}">${v.filename}</a></li>`;
    }).join();

  // also download the photo.... FOR NOW

  const photoJobs = items.reduce(function(ls, v) {
    var p = createDownloadJob(
      { url: v.baseUrl,
        filePath: path.join(IMAGE_DIR, v.filename),
      });
    console.log('created job');
    console.log(p);
    ls.push(p);
    return ls;
    }, []);

    console.log(photoJobs);

    const p = Promise.all(photoJobs);
    p.then(() => {
      // createDownloadJobs(jobs);
      console.log('all downloaded!');
    });



  res.send('<ul>' + s + '</ul>');
  });
};




/*
  Download one image

  photo.filePath: path on disk
  photo.url: google URL to get image (with auth)

  return Promise, write photo to disk
*/
function createDownloadJob(photo) {
  return new Promise(
    function(resolve, reject) {
      console.log("GET: " + photo.url);
      request
        .get(photo.url + "?imgmax=1280")
        .pipe(fs.createWriteStream(photo.filePath)
          .on('finish', resolve)
        );
    }
  ).catch((e) => {
    console.log(e);
  });
};


function createImageListJob(albumId, startIndex) {
  return function(result) {
    return new Promise((resolve, reject) => {
      request({
        url: 'https://picasaweb.google.com/data/feed/api/user/default/albumid/' + albumId,
        headers: {
          'GData-Version': '2'
        },
        qs: {
          access_token : config.google_api.access_token,
          kind : 'photo',
          alt : 'json',
          'start-index' : startIndex,
          fields : 'gphoto:numphotos, entry(title, content)'
        },
        method: 'GET',
        json : true
      }, function(error, response, body) {
        if (error) {
          console.log(error);
        }
        else {
          try {
              //console.log(body);
              if (body.feed && body.feed.entry) {
                //console.log(body.feed.entry.length);
                let photos = body.feed.entry.reduce((filtered, entry) => {
                  if (entry.content.type === 'image/jpeg') {
                    const fileName = path.join(IMAGE_DIR, entry.title["$t"]);
                    if (!fs.existsSync(fileName)) {
                      filtered.push({
                        fileName : fileName,
                        url : entry.content.src
                      });
                    }
                  }
                  return filtered;
                }, []);
                result.push(...photos);
              }
          }
          catch (e) {
            console.log(e)
          }
          resolve(result);
        }
      });
    });
  }
}


module.exports = {

  addRoutes: function(router) {
    router.get('/google/setup/', setup);
    router.get('/google/done/', done);
    router.get('/google/albums/', listAlbums);
    router.get('/google/album/:albumId', listAlbumPhotos);
  },

  setup : setup,
  done : done,
  listAlbums : listAlbums,
  listAlbumPhotos: listAlbumPhotos,
}
