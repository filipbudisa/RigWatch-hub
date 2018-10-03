import {Client, QueryArrayResult, QueryResult} from 'pg';
import {Rig} from './types/interface.Rig';
import {Unit} from './types/interface.Unit';
import * as moment from 'moment';
import {ChartPoint} from './types/interface.ChartPoint';
import {Problem} from './types/interface.Problem';
import {RigAutoReboot} from './types/interface.RigAutoReboot';

export class Database {
	client: Client;


	public constructor(){
		this.client = new Client({
			user: "",
			password: "",
			host: "",
			port: 5432,
			database: ""
		});
	}

	public async connect(){
		await this.client.connect();
	}

	public getSetting(settingName: string, def?: any){
		return new Promise<any>((resolve, reject) => {
			const query = "SELECT value FROM setting WHERE name = $1";
			this.client.query(query, [settingName], (err: Error, res: QueryResult) => {
				if(res.rowCount === 0) resolve(def);
				else resolve(res.rows[0]["value"]);
			});
		});
	}

	public getSettings(settingName?: string[], def?: any){
		return new Promise<any>((resolve, reject) => {
			let query = "SELECT name, value FROM setting";

			if(settingName){
				query +=  "WHERE name IN ('" + settingName.join("', '") + "')";
				// TODO: secure this
			}

			this.client.query(query, [], (err: Error, res: QueryResult) => {
				const retVal: any = {};

				res.rows.forEach((row) => {
					retVal[row["name"]] = row["value"];
				});

				if(def){
					Object.keys(def).forEach((key) => {
						if(!retVal.hasOwnProperty(key)) retVal[key] = def[key];
					});
				}

				resolve(retVal);
			});
		});
	}

	public setSetting(settingName: string, settingValue: any){
		return new Promise<void>((resolve, reject) => {
			const query = "INSERT INTO setting (name, value) VALUES ($1, $2) " +
				"ON CONFLICT(name) DO UPDATE SET value = $2";
			this.client.query(query, [settingName, settingValue], (err: Error, res: QueryResult) => {
				resolve();
			});
		});
	}

	public setSettings(settings: any){
		return new Promise<void>((resolve, reject) => {
			Object.keys(settings).forEach((key) => {
				this.setSetting(key, settings[key]);
			});

			resolve();
		});
	}

	public getRig(name: string){
		return new Promise<Rig>((resolve, reject) => {
			const query = "SELECT name, nicename, power FROM rig WHERE name = $1";
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
			const query = "UPDATE rig SET nicename = $2 WHERE name = $1";
			this.client.query(query, [rig, nicename], (err: Error, res: QueryResult) => {
				resolve();
			});
		});
	}

	public setRigPower(rig: string, power: number){
		return new Promise<void>((resolve, reject) => {
			const query = "UPDATE rig SET power = $2 WHERE name = $1";
			this.client.query(query, [rig, power], (err: Error, res: QueryResult) => {
				resolve();
			});
		});
	}

	public setRigAutoReboot(rig: string, autoReboot: RigAutoReboot){
		return new Promise<void>((resolve, reject) => {
			const query = "UPDATE rig SET auto_reboot = $2 WHERE name = $1";
			this.client.query(query, [rig, autoReboot], (err: Error, res: QueryResult) => {
				resolve();
			});
		});
	}

	public getRigAutoReboot(rig: string){
		return new Promise<RigAutoReboot>((resolve, reject) => {
			const def = <RigAutoReboot> { };

			const query = "SELECT auto_reboot FROM rig WHERE name = $1";
			this.client.query(query, [rig], (err: Error, res: QueryResult) => {
				if(res.rowCount === 0 || !res.rows[0]["auto_reboot"] || res.rows[0]["auto_reboot"] === ""){
					console.log(res.rows);
					resolve(def);
					return;
				}

				try{
					const ret = res.rows[0]["auto_reboot"];

					if(ret.hasOwnProperty("no_cards") && ret.hasOwnProperty("time"))
						resolve(ret);
					else
						resolve(def);
				}catch(e){
					console.log(e);
					resolve(def);
				}
			});
		});
	}

	public newRig(name: string){
		return new Promise<void>((resolve, reject) => {
			const query = "INSERT INTO rig (name) VALUES ($1)";
			this.client.query(query, [name], (err: Error, res: QueryResult) => {
				resolve();
			});
		});
	}

	public rigGetUnits(name: string){
		return new Promise<Unit[]>((resolve, reject) => {
			const query = "SELECT * FROM unit WHERE rig_name = $1";
			this.client.query(query, [name], (err: Error, res: QueryArrayResult) => {
				const units: Unit[] = [];

				res.rows.forEach((row) => {
					units.push(<Unit> {	}); // TODO: something
				});

				resolve(units);
			});
		});
	}

	public addUnit(rigName: string, unitId: number, unit: Unit){
		return new Promise<void>((resolve, reject) => {
			const query = "INSERT INTO unit (rig_name, index) VALUES ($1, $2)";
			const data: any[] = [rigName, unitId];
			this.client.query(query, data, (err: Error, res: QueryResult) => {
				resolve();
			});
		});
	}

	public rigDelete(rigName: string){
		const query = [
			"DELETE FROM report_data WHERE rig_name = $1",
			"DELETE FROM problem WHERE rig_name = $1",
			"DELETE FROM unit WHERE rig_name = $1",
			"DELETE FROM rig WHERE name = $1"
		];

		query.forEach((q) => {
			this.client.query(q, [rigName], (res, err) => {
				if(err) console.log(err);
			});
		});
	}

	public updateUnit(rigName: string, unitId: number, unit: Unit){
		return null;

		/* return new Promise<void>((resolve, reject) => {
			const query = "UPDATE unit SET (tip, make, model) = ($3, $4, $5) WHERE rig_name = $1 AND index = $2";
			const data: any[] = [rigName, unitId, unit.type.valueOf(), unit.make.valueOf(), unit.model];
			this.client.query(query, data, (err: Error, res: QueryResult) => {
				resolve();
			});
		}); */
	}

	public createReport(){
		return new Promise<number>((resolve, reject) => {
			const query = "INSERT INTO report (time) VALUES ($1) RETURNING id";
			this.client.query(query, [moment().format("YYYY-MM-DD HH:mm:ss")], (err: Error, res: QueryResult) => {
				resolve(res.rows[0]["id"]);
			});
		});
	}

	public createReportDated(date: any){
		return new Promise<number>((resolve, reject) => {
			const query = "INSERT INTO report (time) VALUES ($1) RETURNING id";
			this.client.query(query, [date.format("YYYY-MM-DD HH:mm:ss")], (err: Error, res: QueryResult) => {
				resolve(res.rows[0]["id"]);
			});
		});
	}

	public addReportData(report: number, rig: Rig){
		const query = "INSERT INTO report_data (report_id, rig_name, unit_index, temp, hashrate) VALUES ($1, $2, $3, $4, $5)";

		rig.units.forEach((unit, index) => {
			this.client.query(query, [report, rig.name, index, unit.temp, unit.hashrate]);
		});
	}

	public getRigs(){
		return new Promise<Rig[]>((resolve, reject) => {
			const query = "SELECT name, nicename FROM rig";
			const rigs: Rig[] = [];
			this.client.query(query, (err: Error, result: QueryArrayResult) => {
				result.rows.forEach((r) => rigs.push({ name: r["name"], nicename: r["nicename"] }));
				resolve(rigs);
			});
		});
	}

	/**
	 *
	 * @param {string} start Old
	 * @param {string} end New
	 * @return {Promise<ChartPoint[]>}
	 */
	public getChartHashrate(start: string, end: string){
		return new Promise<ChartPoint[]>((resolve, reject) => {
			const query = "SELECT report.time, SUM(hashrate) as hashrate \
				FROM report LEFT JOIN report_data ON report.id = report_data.report_id \
				WHERE report.time BETWEEN $1 AND $2 \
				GROUP BY report.id \
				ORDER BY report.id ASC";
			this.client.query(query, [start, end], (err: Error, res: QueryArrayResult) => {
				const points: ChartPoint[] = [];

				res.rows.forEach((row) => points.push({ time: row["time"], value: parseFloat(row["hashrate"]) }));

				resolve(points);
			});
		});
	}

	public getRigChartHashrate(start: string, end: string, rig: string){
		return new Promise<ChartPoint[]>((resolve, reject) => {
			const query = "SELECT report.time, SUM(hashrate) as hashrate \
				FROM report LEFT JOIN report_data ON report.id = report_data.report_id \
				WHERE report.time BETWEEN $1 AND $2 AND report_data.rig_name = $3 \
				GROUP BY report.id \
				ORDER BY report.id ASC";
			this.client.query(query, [start, end, rig], (err: Error, res: QueryArrayResult) => {
				const points: ChartPoint[] = [];

				res.rows.forEach((row) => points.push({ time: row["time"], value: parseFloat(row["hashrate"]) }));

				resolve(points);
			});
		});
	}

	public getUnitChartHashrate(start: string, end: string, rig: string, unit: number){
		return new Promise<ChartPoint[]>((resolve, reject) => {
			const query = "SELECT report.time, hashrate \
				FROM report LEFT JOIN report_data ON report.id = report_data.report_id \
				AND report_data.unit_index = $4 \
				WHERE report.time BETWEEN $1 AND $2 AND report_data.rig_name = $3 \
				ORDER BY report.id ASC";
			this.client.query(query, [start, end, rig, unit], (err: Error, res: QueryArrayResult) => {
				const points: ChartPoint[] = [];

				res.rows.forEach((row) => points.push({ time: row["time"], value: parseFloat(row["hashrate"]) }));

				resolve(points);
			});
		});
	}

	public getUnitChartTemp(start: string, end: string, rig: string, unit: number){
		return new Promise<ChartPoint[]>((resolve, reject) => {
			const query = "SELECT report.time, temp \
				FROM report LEFT JOIN report_data ON report.id = report_data.report_id \
					AND report_data.rig_name = $3 AND report_data.unit_index = $4 \
				WHERE report.time BETWEEN $1 AND $2 \
				ORDER BY report.id ASC";
			this.client.query(query, [start, end, rig, unit], (err: Error, res: QueryResult) => {
				const points: ChartPoint[] = [];

				res.rows.forEach((row) => points.push({ time: row["time"], value: parseFloat(row["temp"]) }));

				resolve(points);
			});
		});
	}

	public addProblem(rig: string, unit?: number){
		return new Promise<void>((resolve, reject) => {
			let query: string; // = "INSERT INTO situations (time) VALUES ($1) RETURNING id";
			let values: any[];

			if(unit === undefined){
				query = "INSERT INTO problem (type, rig_name, time) VALUES ($1, $2, $3) RETURNING id";
				values = [ 0, rig, moment().format("YYYY-MM-DD HH:mm:ss") ];
			}else{
				query = "INSERT INTO problem (type, rig_name, unit_index, time) VALUES ($1, $2, $3, $4) RETURNING id";
				values = [ 1, rig, unit, moment().format("YYYY-MM-DD HH:mm:ss") ];
			}

			this.client.query(query, values, (err: Error, res: QueryResult) => {
				if(err) console.log(err);
				resolve();
			});
		});
	}

	public findProblem(rig: string, unit?: number){
		return new Promise<number>((resolve, reject) => {
			let query: string;
			let values: any[];

			if(unit === undefined){
				query = "SELECT id FROM problem WHERE type = 0 AND rig_name = $1 AND resolved is null";
				values = [ rig ];
			}else{
				query = "SELECT id FROM problem WHERE type = 1 AND rig_name = $1 AND unit_index = $2 AND resolved is null";
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

	public findUnitsWithProblems(rig: string){
		return new Promise<number[]>((resolve, reject) => {
			const query = "SELECT unit_index FROM problem WHERE type = 1 AND rig_name = $1 AND resolved is null";

			this.client.query(query, [rig], (err: Error, res: QueryResult) => {
				const data: number[] = [];

				if(res.rowCount === 0){
					resolve([]);
					return;
				}

				res.rows.forEach((row) => data.push(row["unit_index"]));

				resolve(data);
			});
		});
	}

	public getProblems(page?: number){
		if(page === undefined) page = 0;

		return new Promise<{ problems: Problem[], more: boolean }>((resolve, reject) => {
			const query = "SELECT * FROM problem ORDER BY id DESC LIMIT 10 OFFSET $1";
			const data = { problems: <Problem[]> [], more: false };

			this.client.query(query, [ 10*page ], (err: Error, res: QueryResult) => {
				data.problems = <Problem[]> res.rows;
				if(res.rowCount === 0){
					resolve(data);
					return;
				}

				this.client.query("SELECT MAX(id) as max FROM problem", (err2: Error, res2: QueryResult) => {
					data.more = res.rows[0]["id"] === res2.rows[0]["max"];
					resolve(data);
				});
			});
		});
	}

	public resolveProblemById(id: number){
		return new Promise<void>((resolve, reject) => {
			const query = "UPDATE problem SET resolved = $2 WHERE id = $1";

			this.client.query(query, [id, moment().format("YYYY-MM-DD HH:mm:ss")], (err: Error, res: QueryResult) => {
				resolve();
			});
		});
	}

	public resolveProblem(rig: string, unit?: number){
		return new Promise<void>((resolve, reject) => {
			let query: string;
			let values: any[];

			if(unit === undefined){
				query = "UPDATE problem SET resolved = $2 WHERE type = 0 AND rig_name = $1 AND resolved is null";
				values = [ rig, moment().format("YYYY-MM-DD HH:mm:ss") ];
			}else{
				query = "UPDATE problem SET resolved = $3 WHERE type = 1 AND rig_name = $1 AND unit_name = $2 AND resolved is null";
				values = [ rig, unit, moment().format("YYYY-MM-DD HH:mm:ss") ];
			}

			this.client.query(query, values, (err: Error, res: QueryResult) => {
				resolve();
			});
		});
	}

	public getUnnotifiedProblems(rigTime: number, unitTime: number){
		if(rigTime === null && unitTime === null){
			return new Promise<Problem[]>((resolve => resolve([]) ));
		}

		const predicates: string[] = [];

		if(rigTime !== null){
			predicates.push("(type = 0 AND time < '" + moment().subtract(rigTime, "minutes").format("YYYY-MM-DD HH:mm:ss") + "')");
		}

		if(unitTime !== null){
			predicates.push("(type = 1 AND time < '" + moment().subtract(unitTime, "minutes").format("YYYY-MM-DD HH:mm:ss") + "')");
		}

		const query = "SELECT id, type, rig_name, unit_index, time FROM problem \
			WHERE reported = FALSE AND resolved is null AND (" + predicates.join(" OR ") + ")";

		return new Promise<Problem[]>((resolve, reject) => {
			this.client.query(query, [], (err: Error, res: QueryResult) => {
				if(err) console.log(err);

				if(res.rowCount === 0){
					resolve([]);
					return;
				}

				resolve(<Problem[]> res.rows);
			});
		});
	}

	public problemReported(situation: number | number[]){
		let query: string;
		if(situation instanceof Array){
			query = "UPDATE problem SET reported = TRUE WHERE id IN (" + situation.join(",") + ")";
		}else{
			query = "UPDATE problem SET reported = TRUE WHERE id = " + situation;
		}

		return new Promise<void>((resolve, reject) => {
			this.client.query(query, [], (err: Error, res: QueryResult) => {
				resolve();
			});
		});
	}

	public getRigDeadUnits(rig: string){
		const query = "select count(unit_index) as count, max(time) as time from problem where rig_name = $1 and resolved is null";

		return new Promise<{ count: number, time: string }>((resolve, reject) => {
			this.client.query(query, [rig], (err: Error, res: QueryResult) => {
				if(res.rowCount === 0){
					resolve({ count: 0, time: "" });
					return;
				}

				resolve(res.rows[0]);
			});
		});
	}

	public getRigFailures(start: string, end: string){
		const query = "select count(*) as count, rig_name from problem " +
			"where type = 0 and time between $1 and $2 group by rig_name " +
			"order by count desc";

		return new Promise<{ count: number, rig_name: string }[]>((resolve, reject) => {
			this.client.query(query, [start, end], (err: Error, res: QueryResult) => {
				resolve(res.rows);
			});
		});
	}

	public getUnitFailures(start: string, end: string){
		const query = "select count(*) as count, rig_name, unit_index from problem " +
			"where type = 1 and time between $1 and $2 group by rig_name, unit_index " +
			"order by count desc";

		return new Promise<{ count: number, rig_name: string, unit_index: number }[]>((resolve, reject) => {
			this.client.query(query, [start, end], (err: Error, res: QueryResult) => {
				resolve(res.rows);
			});
		});
	}
}
