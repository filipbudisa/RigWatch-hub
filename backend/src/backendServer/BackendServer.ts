import * as restify from 'restify';
import {Server} from 'restify';
import {Database} from '../Database';
import {Routes} from './Routes';

export class BackendServer {
	private database: Database;
	private server: Server;


	constructor(database) {
		this.database = database;

		this.server = restify.createServer();
		this.server.use(restify.plugins.jsonBodyParser());

		new Routes(this.server, this.database);
	}

	public listen(port: number, callback?: () => void){
		this.server.listen(port, callback);
	}

}
