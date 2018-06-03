import {BackendServer} from './backendServer/BackendServer';
import {Database} from './Database';
import {RigServer} from './rigServer/RigServer';
import {DataParser} from './rigServer/DataParser';


const database = new Database();
database.connect().then(() => {
	console.log("Database connected");
});

const backendServer = new BackendServer(database);
backendServer.listen(8080, () => {
	console.log("Backend server listening on %d", 8080);
});

const rigServer = new RigServer(database);
rigServer.listen(8082, "0.0.0.0", () => {
	console.log("Rig server listening on %d", 8082);
});
