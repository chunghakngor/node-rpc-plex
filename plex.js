require("dotenv").config();
const PlexAPI = require("plex-api");
const plex = new PlexAPI({
  hostname: process.env.PLEX_SERVER,
  port: process.env.PLEX_PORT,
  username: process.env.PLEX_USERNAME,
  password: process.env.PLEX_PASSWORD,
  token: process.env.PLEX_TOKEN,
});

let sessions = new Object();

exports.runQuery = () => {
  plex.query("/status/sessions").then(
    (result) => {
      if (result.MediaContainer.size == 0) {
        console.log("There is currently no active sessions");
        sessions = {};
      } else {
        let Metadata = result.MediaContainer.Metadata;
        Metadata.forEach((element) => {
          let user = {
            id: element.User.id,
            username: element.User.title,
            thumb: element.User.thumb,
            state: element.Player.state,
          };
          switch (element.type) {
            case "movie":
              user.meta = {
                type: element.type,
                title: element.title,
                year: element.year,
                tagline: element.tagline,
              };
              break;
            case "episode":
              user.meta = {
                type: element.type,
                show: element.grandparentTitle,
                season: element.parentTitle,
                episode: element.index,
                title: element.title,
                year: element.year,
              };
              break;
          }
          sessions[element.User.title] = user;
        });
      }
      return sessions;
    },
    (err) => {
      console.error("Could not connect to server", err);
    }
  );
};
