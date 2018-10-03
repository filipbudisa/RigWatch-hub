import {BackendServer} from './backendServer/BackendServer';
import {Database} from './Database';
import {RigServer} from './rigServer/RigServer';
import {Settings} from './types/interface.Settings';


const database = new Database();
database.connect().then(() => {
	console.log("Database connected");
});

const rigServer = new RigServer(database);
rigServer.listen(8082, "0.0.0.0", () => {
	console.log("Rig server listening on %d", 8082);
});

const backendServer = new BackendServer(database, rigServer);
backendServer.listen(8080, () => {
	console.log("Backend server listening on %d", 8080);
});


const defSettings: Settings = {
	notifEmail: "email@example.com",
	powerPrice: 0,
	reportInterval: 10,
	rigReporting: { enabled: false, time: 5 },
	unitReporting: { enabled: false, time: 5 }
};

database.getSettings(null, defSettings).then((settings: Settings) => {
	rigServer.setCollection(settings.reportInterval);
});