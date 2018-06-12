import {BackendServer} from './backendServer/BackendServer';
import {Database} from './Database';
import {RigServer} from './rigServer/RigServer';


const pollRate = 10; // how often to fetch data from rigs (m)


const database = new Database();
database.connect().then(() => {
	console.log("Database connected");
});

const rigServer = new RigServer(database, pollRate);
rigServer.listen(8082, "0.0.0.0", () => {
	console.log("Rig server listening on %d", 8082);
});

const backendServer = new BackendServer(database, rigServer);
backendServer.listen(8080, () => {
	console.log("Backend server listening on %d", 8080);
});