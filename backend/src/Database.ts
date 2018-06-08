import {Client, QueryArrayResult, QueryResult} from 'pg';
import {Rig} from './types/interface.Rig';
import {Unit} from './types/interface.Unit';
import * as moment from 'moment';
import {ChartPoint} from './types/interface.ChartPoint';

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
				else resolve(res[0]["value"]);
			});
		});
	}

	public setSetting(settingName: string, settingValue: any){
		return new Promise<void>((resolve, reject) => {
			const query = "INSERT INTO settings (name, value) VALUES ($1, $2) " +
				"ON CONFLICT(name) DO UPDATE value = $2";
			this.client.query(query, [settingName, settingValue], (err: Error, res: QueryResult) => {
				resolve();
			});
		});
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
				GROUP BY reports.id";
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
				GROUP BY reports.id";
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
				WHERE reports.time BETWEEN $2 AND $1 AND report_data.rig = $3 AND report_data.unit = $4";
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
				WHERE reports.time BETWEEN $2 AND $1 AND report_data.rig = $3 AND report_data.unit = $4";
			this.client.query(query, [start, end, rig, unit], (err: Error, res: QueryResult) => {
				const points: ChartPoint[] = [];

				res.rows.forEach((row) => points.push({ time: row["time"], value: parseFloat(row["temp"]) }));

				resolve(points);
			});
		});
	}
}