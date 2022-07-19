"use strict";

const exec = require("child_process").exec;
const RPC = require("discord-rpc");
const EventEmitter = require("events");
const PlexAPI = require("plex-api");
const plex = new PlexAPI({
	hostname: process.env.PLEX_SERVER,
	port: process.env.PLEX_PORT,
	username: process.env.PLEX_USERNAME,
	password: process.env.PLEX_PASSWORD,
	token: process.env.PLEX_TOKEN,
});

class RPCHandler extends EventEmitter {
	connected = false;
	activityCache;

	constructor(rpc) {
		super();
		this.rpc = rpc;
	}

	updatePresence(presence) {
		this.connected ? this.rpc.setActivity(presence).catch((e) => this.emit("error", e)) : (activityCache = presence);
	}

	clearActivity() {
		this.rpc.clearActivity().catch((e) => this.emit("error", e));
	}

	disconnect() {
		this.rpc.destroy().catch((e) => this.emit("error", e));
	}

	runQuery() {
		plex.query("/status/sessions").then(
			(result) => {
				let set = new Set();
				this.activityCache = {};
				if (result.MediaContainer.size == 0) {
					this.activityCache = null;
				} else {
					let Metadata = result.MediaContainer.Metadata;
					Metadata.forEach((media) => {
						let User = media.User;
						let user = { id: User.id, username: User.title, thumb: User.thumb, state: media.Player.state, viewOffset: media.viewOffset, duration: media.Media[0].duration };
						if (set.has(User.title)) return;
						switch (media.type) {
							case "movie":
								user.meta = { type: media.type, title: media.title, year: media.year, tagline: media.tagline, genre: media.Genre[0].tag, rating: media.rating, resolution: media.Media[0].videoResolution };
								break;
							case "episode":
								user.meta = { type: media.type, show: media.grandparentTitle, season: media.parentIndex, episode: media.index, title: media.title, year: media.year };
								break;
							case "track":
								user.meta = { type: media.type, artist: media.grandparentTitle, album: media.parentTitle, episode: media.index, title: media.title, year: media.parentYear, thumb: media.thumb, codec: `[${media?.Media[0]?.audioCodec?.toUpperCase()}]` };
								break;
						}
						set.add(User.title);
						this.activityCache[User.title] = user;
					});
				}
			},
			(err) => this.emit("error", err)
		);
	}
}

const RPCWrapper = (clientId) => {
	const browser = typeof window !== "undefined";
	const rpc = new RPC.Client({ transport: browser ? "websocket" : "ipc" });

	const eventHandler = new RPCHandler(rpc);

	rpc.on("error", (e) => eventHandler.emit("error", e));

	rpc
		.login({ clientId })
		.then(() => {
			eventHandler.emit("connected");
			eventHandler.connected = true;
		})
		.catch((e) => eventHandler.emit("error", e));

	return eventHandler;
};

const updateRPC = (rpc, time) => {
	let sessions = rpc.activityCache;
	let presence = { largeImageKey: `plex_logo`, instance: 1 };
	if (sessions != undefined && process.env.PLEX_USERNAME in sessions) {
		let data = sessions[process.env.PLEX_USERNAME];
		presence.smallImageKey = data.state;
		if (data.meta.type != undefined && data.meta.type === "movie") {
			presence.largeImageText = `Watching a Movie`;
			presence.details = `${data.meta.title} (${data.meta.year})`;
			presence.state = `${data.meta.genre}`;
		} else if (data.meta.type != undefined && data.meta.type === "episode") {
			presence.largeImageText = `Watching a TV Show`;
			presence.details = `${data.meta.show} (${data.meta.year})`;
			presence.state = `S${data.meta.season} E${data.meta.episode} - ${data.meta.title}`;
		} else if (data.meta.type != undefined && data.meta.type === "track") {
			presence.largeImageText = `Listening to Music`;
			presence.state = `${data.meta.album} (${data.meta.year})`;
			presence.details = `"${data.meta.title}" by ${data.meta.artist}`;
		} 
		if (data.state === "paused") {
			presence.smallImageText = `Paused`;
			time -= 1000;
		} else if (data.state === "playing") {
			presence.startTimestamp = time;
			presence.smallImageText = `Playing`;
		}
	} else {
		presence = { details: "Idling", state: "Idling", largeImageKey: "plex_logo", largeImageText: "Idling", smallImageKey: "plex_logo", smallImageText: "Idling", instance: 1 };
	}
	rpc.updatePresence(presence);
};

const checkProcess = (query) =>
	new Promise((res, rej) => {
		let platform = process.platform;
		let cmd = "";
		switch (platform) {
			case "win32":
				cmd = `tasklist`;
				break;
			case "darwin":
				cmd = `ps -ax | grep ${query}`;
				break;
			case "linux":
				cmd = `ps -A`;
				break;
			default:
				break;
		}
		exec(cmd, (err, stdout, stderr) => res(stdout.toLowerCase().indexOf(query.toLowerCase()) > -1));
	});

module.exports = { RPCWrapper, updateRPC, checkProcess };
