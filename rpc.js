require("dotenv").config();

const { RPCWrapper, updateRPC, checkProcess } = require("./wrapper");

const rpc = RPCWrapper(process.env.CLIENT_ID);

let time;

rpc.on("connected", () => {
	console.log("Connected!");
	setInterval(async () => {
		if (await checkProcess("plex.exe")) {
			try {
				rpc.runQuery();
				time == undefined ? (time = Date.now()) : null;
				if (rpc.activityCache == null) {
					rpc.updatePresence({ details: "Idling", state: "Idling", largeImageKey: "plex_logo", largeImageText: "Idling", smallImageKey: "plex_logo", smallImageText: "Idling", instance: 1 });
				} else {
					updateRPC(rpc, time);
				}
			} catch (error) {
				console.error(error);
			}
		} else {
			rpc.clearActivity();
		}
	}, 1000);
});

rpc.on("error", console.error);