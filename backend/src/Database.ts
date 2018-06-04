import {Client, QueryArrayResult, QueryResult} from 'pg';
import {Rig} from './types/interface.Rig';
import {Unit} from './types/interface.Unit';

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
			const query = "SELECT name FROM rigs WHERE name = $1";
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
		return new Promise<void>((resolve, reject) => {
			const query = "INSERT INTO rigs (name) VALUES ($1)";
			this.client.query(query, [name], (err: Error, res: QueryResult) => {
				resolve();
			});
		});
	}

	public rigGetUnits(name: string){
		return new Promise<Unit[]>((resolve, reject) => {
			const query = "SELECT * FROM units WHERE rig = $1";
			this.client.query(query, [name], (err: Error, res: QueryArrayResult) => {
				const units: Unit[] = [];

				res.rows.forEach((row) => {
					units.push(<Unit> {
						type: row["tip"],
						make: row["make"],
						model: row["model"]
					});
				});

				resolve(units);
			});
		});
	}

	public addUnit(rigName: string, unitId: number, unit: Unit){
		return new Promise<void>((resolve, reject) => {
			const query = "INSERT INTO units (rig, id, tip, make, model) VALUES ($1, $2, $3, $4, $5)";
			const data: any[] = [rigName, unitId, unit.type.valueOf(), unit.make.valueOf(), unit.model];
			this.client.query(query, data, (err: Error, res: QueryResult) => {
				resolve();
			});
		});
	}

	public updateUnit(rigName: string, unitId: number, unit: Unit){
		return new Promise<void>((resolve, reject) => {
			const query = "UPDATE units SET (tip, make, model) = ($3, $4, $5) WHERE rig = $1 AND id = $2";
			const data: any[] = [rigName, unitId, unit.type.valueOf(), unit.make.valueOf(), unit.model];
			this.client.query(query, data, (err: Error, res: QueryResult) => {
				resolve();
			});
		});
	}
}