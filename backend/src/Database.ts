import {Client, QueryArrayResult, QueryResult} from 'pg';
import {Rig} from './types/interface.Rig';
import {Unit} from './types/interface.Unit';
import * as moment from 'moment';
import {ChartPoint} from './types/interface.ChartPoint';
import {Situation} from './types/interface.Situation';

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

	public getSetting(settingName: string, def?: any){
		return new Promise<any>((resolve, reject) => {
			const query = "SELECT value FROM settings WHERE name = $1";
			this.client.query(query, [settingName], (err: Error, res: QueryResult) => {
				if(res.rowCount === 0) resolve(def);
				else resolve(res.rows[0]["value"]);
			});
		});
	}

	public setSetting(settingName: string, settingValue: any){
		return new Promise<void>((resolve, reject) => {
			const query = "INSERT INTO settings (name, value) VALUES ($1, $2) " +
				"ON CONFLICT(name) DO UPDATE SET value = $2";
			this.client.query(query, [settingName, settingValue], (err: Error, res: QueryResult) => {
				if(err) console.log(err);
				if(res) console.log(res.command);
				resolve();
			});
		});
	}

	public getRig(name: string){
		return new Promise<Rig>((resolve, reject) => {
			const query = "SELECT name, nicename FROM rigs WHERE name = $1";
			this.client.query(query, [name], (err: Error, res: QueryResult) => {
				if(err !== null){
					resolve(null);
					return;
				}

				if(res.rowCount === 0){
					resolve(null);
					return;
				}

				resolve(<Rig> res.rows[0]);
			});
		});
	}

	public setRigNicename(rig: string, nicename: string){
		return new Promise<void>((resolve, reject) => {
			const query = "UPDATE rigs SET nicename = $2 WHERE name = $1";
			this.client.query(query, [rig, nicename], (err: Error, res: QueryResult) => {
				resolve();
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

	public createReport(){
		return new Promise<number>((resolve, reject) => {
			const query = "INSERT INTO reports (time) VALUES ($1) RETURNING id";
			this.client.query(query, [moment().format("YYYY-MM-DD HH:mm:ss")], (err: Error, res: QueryResult) => {
				resolve(res.rows[0]["id"]);
			});
		});
	}

	public addReportData(report: number, rig: Rig){
		const query = "INSERT INTO report_data (report, rig, unit, temp, speed) VALUES ($1, $2, $3, $4, $5)";

		rig.units.forEach((unit, index) => {
			this.client.query(query, [report, rig.name, index, unit.temp, unit.hashrate]);
		});
	}

	public getRigs(){
		return new Promise<Rig[]>((resolve, reject) => {
			const query = "SELECT name, nicename FROM rigs";
			const rigs: Rig[] = [];
			this.client.query(query, (err: Error, result: QueryArrayResult) => {
				result.rows.forEach((r) => rigs.push({ name: r["name"], nicename: r["nicename"] }));
				resolve(rigs);
			});
		});
	}

	/**
	 *
	 * @param {string} start New
	 * @param {string} end Old
	 * @return {Promise<ChartPoint[]>}
	 */
	public getChartHashrate(start: string, end: string){
		return new Promise<ChartPoint[]>((resolve, reject) => {
			const query = "SELECT reports.time, SUM(speed) as hashrate \
				FROM reports LEFT JOIN report_data ON reports.id = report_data.report \
				WHERE reports.time BETWEEN $2 AND $1 \
				GROUP BY reports.id \
				ORDER BY reports.id ASC";
			this.client.query(query, [start, end], (err: Error, res: QueryArrayResult) => {
				const points: ChartPoint[] = [];

				res.rows.forEach((row) => points.push({ time: row["time"], value: parseFloat(row["hashrate"]) }));

				resolve(points);
			});
		});
	}

	public getRigChartHashrate(start: string, end: string, rig: string){
		return new Promise<ChartPoint[]>((resolve, reject) => {
			const query = "SELECT reports.time, SUM(speed) as hashrate \
				FROM reports LEFT JOIN report_data ON reports.id = report_data.report AND report_data.rig = $3 \
				WHERE reports.time BETWEEN $2 AND $1 \
				GROUP BY reports.id \
				ORDER BY reports.id ASC";
			this.client.query(query, [start, end, rig], (err: Error, res: QueryArrayResult) => {
				const points: ChartPoint[] = [];

				res.rows.forEach((row) => points.push({ time: row["time"], value: parseFloat(row["hashrate"]) }));

				resolve(points);
			});
		});
	}

	public getUnitChartHashrate(start: string, end: string, rig: string, unit: number){
		return new Promise<ChartPoint[]>((resolve, reject) => {
			const query = "SELECT reports.time, speed as hashrate \
				FROM reports LEFT JOIN report_data ON reports.id = report_data.report \
				WHERE reports.time BETWEEN $2 AND $1 AND report_data.rig = $3 AND report_data.unit = $4 \
				ORDER BY reports.id ASC";
			this.client.query(query, [start, end, rig, unit], (err: Error, res: QueryArrayResult) => {
				const points: ChartPoint[] = [];

				res.rows.forEach((row) => points.push({ time: row["time"], value: parseFloat(row["hashrate"]) }));

				resolve(points);
			});
		});
	}

	public getUnitChartTemp(start: string, end: string, rig: string, unit: number){
		return new Promise<ChartPoint[]>((resolve, reject) => {
			const query = "SELECT reports.time, temp \
				FROM reports LEFT JOIN report_data ON reports.id = report_data.report \
				WHERE reports.time BETWEEN $2 AND $1 AND report_data.rig = $3 AND report_data.unit = $4 \
				ORDER BY reports.id ASC";
			this.client.query(query, [start, end, rig, unit], (err: Error, res: QueryResult) => {
				const points: ChartPoint[] = [];

				res.rows.forEach((row) => points.push({ time: row["time"], value: parseFloat(row["temp"]) }));

				resolve(points);
			});
		});
	}

	public addSituation(rig: string, unit?: number){
		return new Promise<void>((resolve, reject) => {
			let query: string; // = "INSERT INTO situations (time) VALUES ($1) RETURNING id";
			let values: any[];

			if(unit === undefined){
				query = "INSERT INTO situations (type, rig, time) VALUES ($1, $2, $3) RETURNING id";
				values = [ 0, rig, moment().format("YYYY-MM-DD HH:mm:ss") ];
			}else{
				query = "INSERT INTO situations (type, rig, unit, time) VALUES ($1, $2, $3, $4) RETURNING id";
				values = [ 1, rig, unit, moment().format("YYYY-MM-DD HH:mm:ss") ];
			}

			this.client.query(query, values, (err: Error, res: QueryResult) => {
				if(err) console.log(err);
				resolve();
			});
		});
	}

	public findSituation(rig: string, unit?: number){
		return new Promise<number>((resolve, reject) => {
			let query: string;
			let values: any[];

			if(unit === undefined){
				query = "SELECT id FROM situations WHERE type = 0 AND rig = $1 AND resolved is null";
				values = [ rig ];
			}else{
				query = "SELECT id FROM situations WHERE type = 1 AND rig = $1 AND unit = $2 AND resolved is null";
				values = [ rig, unit ];
			}

			this.client.query(query, values, (err: Error, res: QueryResult) => {
				if(res.rowCount === 0){
					resolve(null);
					return;
				}

				resolve(res.rows[0]["id"]);
			});
		});
	}

	public findUnitSituations(rig: string){
		return new Promise<number[]>((resolve, reject) => {
			const query = "SELECT unit FROM situations WHERE type = 1 AND rig = $1 AND resolved is null";

			this.client.query(query, [rig], (err: Error, res: QueryResult) => {
				const data: number[] = [];

				if(res.rowCount === 0){
					resolve([]);
					return;
				}

				res.rows.forEach((row) => data.push(row["unit"]));

				resolve(data);
			});
		});
	}

	public getSituations(page?: number){
		if(page === undefined) page = 0;

		return new Promise<{ situations: Situation[], more: boolean }>((resolve, reject) => {
			const query = "SELECT * FROM situations ORDER BY id DESC LIMIT 10 OFFSET $1";
			const data = { situations: <Situation[]> [], more: false };

			this.client.query(query, [ 10*page ], (err: Error, res: QueryResult) => {
				data.situations = <Situation[]> res.rows;
				if(res.rowCount === 0){
					resolve(data);
					return;
				}

				this.client.query("SELECT MAX(id) as max FROM situations", (err2: Error, res2: QueryResult) => {
					data.more = res.rows[0]["id"] === res2.rows[0]["max"];
					resolve(data);
				});
			});
		});
	}

	public resolveSituationById(id: number){
		return new Promise<void>((resolve, reject) => {
			const query = "UPDATE situations SET resolved = $2 WHERE id = $1";

			this.client.query(query, [id, moment().format("YYYY-MM-DD HH:mm:ss")], (err: Error, res: QueryResult) => {
				resolve();
			});
		});
	}

	public resolveSituation(rig: string, unit?: number){
		return new Promise<void>((resolve, reject) => {
			let query: string;
			let values: any[];

			if(unit === undefined){
				query = "UPDATE situations SET resolved = $2 WHERE type = 0 AND rig = $1 AND resolved is null";
				values = [ rig, moment().format("YYYY-MM-DD HH:mm:ss") ];
			}else{
				query = "UPDATE situations SET resolved = $3 WHERE type = 1 AND rig = $1 AND unit = $2 AND resolved is null";
				values = [ rig, unit, moment().format("YYYY-MM-DD HH:mm:ss") ];
			}

			this.client.query(query, values, (err: Error, res: QueryResult) => {
				resolve();
			});
		});
	}

	public getUnnotifiedSituations(rigTime: number, unitTime: number){
		if(rigTime === null && unitTime === null){
			return new Promise<Situation[]>((resolve => resolve([]) ));
		}

		const predicates: string[] = [];

		if(rigTime !== null){
			predicates.push("(type = 0 AND time < '" + moment().subtract(rigTime, "minutes").format("YYYY-MM-DD HH:mm:ss") + "')");
		}

		if(unitTime !== null){
			predicates.push("(type = 1 AND time < '" + moment().subtract(unitTime, "minutes").format("YYYY-MM-DD HH:mm:ss") + "')");
		}

		const query = "SELECT id, type, rig, unit, time FROM situations \
			WHERE reported = FALSE AND dismissed = FALSE AND resolved is null AND (" + predicates.join(" OR ") + ")";

		return new Promise<Situation[]>((resolve, reject) => {
			this.client.query(query, [], (err: Error, res: QueryResult) => {
				if(res.rowCount === 0){
					resolve([]);
					return;
				}

				resolve(<Situation[]> res.rows);
			});
		});
	}

	public situationReported(situation: number | number[]){
		let query: string;
		if(situation instanceof Array){
			query = "UPDATE situations SET reported = TRUE WHERE id IN (" + situation.join(",") + ")";
		}else{
			query = "UPDATE situations SET reported = TRUE WHERE id = " + situation;
		}

		return new Promise<void>((resolve, reject) => {
			this.client.query(query, [], (err: Error, res: QueryResult) => {
				resolve();
			});
		});
	}
}