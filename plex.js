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
				Metadata.forEach((media) => {
					let User = media.User;
					let user = { id: User.id, username: User.title, thumb: User.thumb, state: media.Player.state };
					switch (media.type) {
						case "movie":
							user.meta = { type: media.type, title: media.title, year: media.year, tagline: media.tagline };
							break;
						case "episode":
							user.meta = {
								type: media.type,
								show: media.grandparentTitle,
								season: media.parentTitle,
								episode: media.index,
								title: media.title,
								year: media.year,
							};
							break;
					}
					sessions[User.title] = user;
				});
			}
			return sessions;
		},
		(err) => {
			console.error("Could not connect to server", err);
		}
	);
};
