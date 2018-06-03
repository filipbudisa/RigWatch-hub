import {Client, QueryResult} from 'pg';
import {Rig} from './types/interface.Rig';

export class Database {
	client: Client;


	public constructor(){
		this.client = new Client({
			user: "rigwatch",
			password: "rigwatchlozinka",
			host: "rig.sprint.ninja",
			port: 5432,
			database: "rigwatch"
		});
	}

	public async connect(){
		await this.client.connect();
	}

	public getRig(name: string){
		return new Promise<Rig>((resolve, reject) => {
			const query = "SELECT id, name FROM rigs WHERE name = $1";
			this.client.query(query, [name], (err: Error, res: QueryResult) => {
				if(err !== null){
					resolve(null);
				}

				if(res.rowCount === 0) resolve(null);

				resolve(<Rig> res.rows[0]);
			});
		});
	}

	public newRig(name: string){
		const query = "INSERT INTO rigs (name) VALUES ($1)";
		this.client.query(query, [name], (err: Error, res: QueryResult) => {
			// TODO: error handling
		});
	}
}