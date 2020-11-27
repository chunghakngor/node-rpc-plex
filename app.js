require("dotenv").config();
const { runQuery } = require("./plex");
const rpc = require("discord-rich-presence")(process.env.CLIENT_ID);

let sessions = new Object();

const updateRPC = (rpc) => {
	let presence = { largeImageKey: `plex`, smallImageKey: `plex`, instance: 1 };

	if (trackingUser in sessions) {
		let data = sessions[process.env.PLEX_USERNAME];
		if (data.meta.type === "movie") {
			presence.largeImageText = `Watching a Movie`;
			presence.details = `${data.meta.title}`;
			presence.state = `"${data.meta.tagline}"`;
		} else if (data.meta.type === "episode") {
			presence.largeImageText = `Watching a TV Show`;
			presence.details = `${data.meta.show}`;
			presence.state = `${data.meta.season} - Episode ${data.meta.episode} ${data.meta.title}`;
		}

		if (data.state === "paused") {
			presence.smallImageText = `Paused`;
		} else if (data.state === "playing") {
			presence.smallImageText = `Playing`;
		}
	} else {
		console.log("User not found in any sessions!");
	}
	rpc.updatePresence(presence);
};

rpc.on("connected", () => {
	console.log("Connected!");
	setInterval(() => {
		sessions = runQuery();
		Object.keys(sessions).length === 0 ? null : updateRPC(rpc);
	}, 1000);
});

process.on("unhandledRejection", console.error);
