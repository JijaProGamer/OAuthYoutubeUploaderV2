const fs = require("fs-extra");
const { authorize, uploadVideo, setupServer } = require("./index.js");

setupServer(9500);

authorize(fs.readJSONSync("client_secret.json")).then((auth) => {
  uploadVideo(auth, {
    title: "This is a test title",
    description: "This is the best description",
    privacyStatus: "public",
    video: fs.createReadStream("video.mkv"),
    thumbnail: fs.createReadStream("thumbnail.png"),
  }).then((id) => console.log(`https://www.youtube.com/watch?v=${id}`));
});
