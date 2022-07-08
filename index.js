const fs = require("fs");
const path = require("path");
const express = require("express");
const { google } = require("googleapis");
const OAuth2 = google.auth.OAuth2;
const service = google.youtube("v3");

const app = express();
let currentId;

const SCOPES = [
  "https://www.googleapis.com/auth/youtube.upload",
  "https://www.googleapis.com/auth/youtube.readonly",
];

const authorize = (credentials, forceNewToken, cb) => {
  return new Promise((resolve, reject) => {
    const clientSecret = credentials.web.client_secret;
    const clientId = credentials.web.client_id;
    const redirectUrl = credentials.web.redirect_uris[0];
    const oauth2Client = new OAuth2(clientId, clientSecret, redirectUrl);

    fs.readFile(module.exports.TOKEN_PATH, async (error, token) => {
      if (error || forceNewToken) {
        let credentials = await getNewToken(oauth2Client, cb);
        oauth2Client.credentials = credentials;

        resolve(oauth2Client);
      } else {
        oauth2Client.credentials = JSON.parse(token);

        resolve(oauth2Client);
      }
    });
  });
};

function waitForId() {
  return new Promise((resolve, reject) => {
    let interval = setInterval(() => {
      if (currentId) {
        clearInterval(interval);
        resolve();
      }
    }, 100);
  });
}

const getNewToken = (oauth2Client, cb) => {
  return new Promise(async (resolve, reject) => {
    currentId = undefined;

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: "offline",
      scope: SCOPES,
    });

    cb(authUrl);

    await waitForId();

    oauth2Client.getToken(currentId, (error, token) => {
      if (error) {
        return reject(error);
      }

      oauth2Client.credentials = token;
      storeToken(token);

      resolve(oauth2Client);
    });
  });
};

const storeToken = (token) => {
  fs.writeFileSync(module.exports.TOKEN_PATH, JSON.stringify(token));
};

const uploadVideo = (auth, options) => {
  return new Promise((resolve, reject) => {
    service.videos
      .insert({
        auth: auth,
        part: "snippet,contentDetails,status",
        resource: {
          snippet: {
            title: options.title || "",
            description: options.description || "",
            tags: options.tags || [],
          },

          status: {
            privacyStatus: options.privacyStatus || "public",
          },
        },

        media: {
          body: options.video,
        },
      })
      .then((data) => {
        if (options.thumbnail) {
          setThumbnail(auth, data.data.id, options.thumbnail)
            .then(() => {
              resolve(data.data.id);
            })
            .catch(reject);
        } else {
          resolve(data.data.id);
        }
      })
      .catch(reject);
  });
};

const setThumbnail = (auth, videoId, thumbnail) => {
  return new Promise((resolve, reject) => {
    service.thumbnails
      .set({
        videoId,
        auth,
        media: {
          body: thumbnail,
        },
      })
      .then(resolve)
      .catch(reject);
  });
};

app.get("/", (req, res) => {
  res.send(`You can close this now`);

  currentId = req.query.code;
});

const setupServer = (port) => {
  app.listen(port);
};

module.exports = { 
    authorize, 
    uploadVideo, 
    setupServer, 
    setThumbnail,
    TOKEN_PATH: path.join(__dirname, "upload_app_session.json"),
 };
