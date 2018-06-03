import {Server} from 'restify';
import {Database} from '../Database';

export class Routes {
	private server: Server;
	private database: Database;

	public constructor(server: Server, database: Database){
		this.server = server;
		this.database = database;

		this.setupRoutes();
	}

	private setupRoutes(){
		this.server.post("/register", this.routeRegister);
	}

	private routeRegister(){

	}
}