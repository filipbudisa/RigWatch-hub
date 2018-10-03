import {Database} from '../Database';
import * as net from 'net';
import {Server, Socket} from 'net';
import {ConnectedRig} from '../types/interface.ConnectedRig';
import {Rig} from '../types/interface.Rig';
import {DataParser} from './DataParser';
import {Unit} from '../types/interface.Unit';
import Timer = NodeJS.Timer;
import {ProblemReporting} from '../types/interface.ProblemReporting';
import {Problem} from '../types/interface.Problem';
import moment = require('moment');
import * as nodemailer from "nodemailer";
import {clearInterval} from 'timers';

export class RigServer {
	private database: Database;
	private server: Server;

	private rigs: ConnectedRig[] = [];
	private dataRequests: { id: number, callback: (Rig) => void, timeout: Timer }[] = [];

	private rigReporting: number = null;
	private unitReporting: number = null;
	private reporting: Timer = null;

	public collectionInterval: number;
	private collection: Timer;

	private mailTransporter;

	public constructor(database: Database){
		this.database = database;

		this.server = net.createServer(s => this.connection(s));

		this.updateReporting();

		this.mailTransporter = nodemailer.createTransport({
			sendmail: true,
			newline: "unix",
			path: "/usr/sbin/sendmail"
		});
	}

	public updateReporting(){
		const defReporting: ProblemReporting = { enabled: false };
		let i = 0;

		this.database.getSetting("rigReporting", JSON.stringify(defReporting)).then((data: string) => {
			const rigReporting: ProblemReporting = JSON.parse(data);

			if(rigReporting.enabled) this.rigReporting = rigReporting.time;
			else this.rigReporting = null;

			if(++i === 2){
				if(this.reporting) clearInterval(this.reporting);
				this.reporting = setInterval(() => this.reportingCheck(), 60000);
			}
		});

		this.database.getSetting("unitReporting", JSON.stringify(defReporting)).then((data: string) => {
			const unitReporting: ProblemReporting = JSON.parse(data);

			if(unitReporting.enabled) this.unitReporting = unitReporting.time;
			else this.unitReporting = null;

			if(++i === 2){
				if(this.reporting) clearInterval(this.reporting);
				this.reporting = setInterval(() => this.reportingCheck(), 60000);
			}
		});
	}

	private reportingCheck(){
		this.database.getRigs().then((rigs) => {
			rigs.forEach((r) => {
				this.database.getRigDeadUnits(r.name).then((dead) => {
					if(dead.count === 0) return;

					this.database.getRigAutoReboot(r.name).then((ar) => {
						if(ar.no_cards === undefined || ar.time === undefined || ar.no_cards === 0) return;
						if(dead.count < ar.no_cards) return;

						const mins = moment().diff(moment(dead.time), "minutes", true);

						if(mins >= ar.time){
							this.rigReboot(r.name);
						}
					});
				});
			});
		});

		if(this.rigReporting === null && this.unitReporting === null) return;

		this.database.getUnnotifiedProblems(this.rigReporting, this.unitReporting).then((sits: Problem[]) => {
			if(sits.length === 0) return;

			this.database.getSetting("notifEmail", "").then((email: string) => {
				if(email === "") return;

				let report = "";
				const sitIds: number[] = [];

				sits.forEach((sit) => {
					report += "Rig " + sit.rig_name;
					if(sit.type === 1) report += " unit " + sit.unit_index;
					report += " died " + moment(sit.time).format("LLL") + "\n";

					sitIds.push(sit.id);
				});

				this.mailTransporter.sendMail({
					from: "system@rig.sprint.ninja",
					to: email,
					subject: "Problem at rig.sprint.ninja",
					text: report
				}, (err, info) => {
					if(err){
						console.log("Email error: " + err);
					}else{
						this.database.problemReported(sitIds);
					}
				});
			});
		});
	}

	public rigReboot(rig: string){
		const i = this.rigs.findIndex((r) => r.rig.name === rig);
		if(i === -1) return;

		const buf: Buffer = Buffer.allocUnsafe(5);
		buf.writeUInt8(2, 0);
		buf.writeUInt32LE(0, 1);

		this.rigs[i].socket.write(buf);
	}

	public rigRestart(rig: string){
		const i = this.rigs.findIndex((r) => r.rig.name === rig);
		if(i === -1) return;

		const buf: Buffer = Buffer.allocUnsafe(5);
		buf.writeUInt8(3, 0);
		buf.writeUInt32LE(0, 1);

		this.rigs[i].socket.write(buf);
	}

	public rigDisconnect(rig: string){
		const i = this.rigs.findIndex((r) => r.rig.name === rig);
		if(i === -1) return;

		this.rigs[i].socket.destroy();
		this.rigs.splice(i, 1);
	}

	public checkRig(rig: string){
		return this.rigs.findIndex((r) => r.rig.name === rig) !== -1;
	}

	public getRigData(rig: string, callback: (Rig) => void){
		const i = this.rigs.findIndex((r) => r.rig.name === rig);

		if(i === -1){
			callback(null);
			return;
		}

		let id: number;
		do {
			id = Math.round(Math.random() * 1000);
		} while(this.dataRequests.findIndex((dr) => dr.id === id) !== -1);

		const timeout = setTimeout(() => {
			const i2 = this.dataRequests.findIndex((dr) => dr.id === id);

			if(i2 !== -1){
				this.dataRequests.splice(i2, 1);
				callback(null);
			}
		}, 10000);

		this.dataRequests.push({ id: id, callback: callback, timeout: timeout });

		const buf: Buffer = Buffer.allocUnsafe(5);
		buf.writeUInt8(1, 0);
		buf.writeUInt32LE(id, 1);

		this.rigs[i].socket.write(buf);
	}

	public getTotalHashrate(callback: (number) => void){
		let hashrate = 0;
		let noData = 0;
		const totalData = this.rigs.length;

		if(totalData === 0){
			callback(0);
			return;
		}

		for(const rig of this.rigs){
			this.getRigData(rig.rig.name, (rigData: Rig) => {
				hashrate += rigData.hashrate;
				if(++noData === totalData) callback(hashrate);
			});
		}
	}

	public listen(port: number, host: string, callback?: () => void){
		this.server.listen(port, host);
		callback();
	}

	public setCollection(interval: number){
		if(this.collection){
			clearTimeout(this.collection);
		}

		this.collectionInterval = interval;
		this.collection = setInterval(() => this.collectData(), this.collectionInterval*1000*60);
	}

	private collectData(){
		this.database.createReport().then((report) => {
			const buf: Buffer = Buffer.allocUnsafe(5);
			buf.writeUInt8(0, 0);
			buf.writeUInt32LE(report, 1);

			this.rigs.forEach((rig) => {
				rig.socket.write(buf);
			});
		});
	}

	private connection(socket: Socket){
		console.log("Connection from %s", socket.remoteAddress);

		socket.on('data', (dataBuf: Buffer) => {
			const data: string = "" + dataBuf;

			const dataIndex = data.indexOf("{");
			const preData: string[] = data.substr(0, dataIndex).split(";");
			const postData = data.substring(dataIndex);

			const rig: Rig = DataParser.parseData(postData, preData[1]);

			if(preData[0] === "reg"){
				const i = this.rigs.findIndex((r) => r.rig.name === rig.name);

				if(i === -1){
					this.registerRig(rig, socket);
				}else{
					this.rigs[i].socket = socket;
				}
			}else if(preData[0] === "report"){
				this.dataReport(parseFloat(preData[2]), rig);
			}else if(preData[0] === "data"){
				const reqI = this.dataRequests.findIndex((dr) => dr.id === parseFloat(preData[2]));

				if(reqI !== -1){
					const request = this.dataRequests[reqI];
					this.dataRequests.splice(reqI, 1);
					clearTimeout(request.timeout);
					request.callback(rig);
				}
			}

			this.database.findUnitsWithProblems(rig.name).then((units: number[]) => {
				rig.units.forEach((u, i) => {
					if(u.hashrate === 0 && units.findIndex((ui) => ui === i) === -1)
						this.database.addProblem(rig.name, i);

					if(u.hashrate !== 0 && units.findIndex((ui) => ui === i) !== -1)
						this.database.resolveProblem(rig.name, i);
				});
			});
		});

		// TODO: error handling
		socket.on('close', (he) => this.deregisterRig(socket));
		socket.on('end',() => this.deregisterRig(socket));
		socket.on('error', (err) => this.deregisterRig(socket));
		socket.on('timeout', () => this.deregisterRig(socket));

		// setTimeout(() => this.collectData(), 5000);
	}

	private dataReport(report: number, rig: Rig){
		this.database.addReportData(report, rig);
	}

	private registerRig(rig: Rig, socket: Socket){
		this.rigs.push(<ConnectedRig> {
			rig: rig,
			socket: socket
		});

		function registerUnits(db: Database){
			db.rigGetUnits(rig.name).then((units: Unit[]) => {
				rig.units.forEach((unit, i) => {
					if(i >= units.length) db.addUnit(rig.name, i, unit);
					/* else if(units[i].make !== unit.make || units[i].model !== unit.model || units[i].type !== unit.type)
						db.updateUnit(rig.name, i, unit); */

					// TODO: unit updating
				});
			});
		}

		this.database.getRig(rig.name).then((dbRig: Rig) => {
			if(dbRig === null) this.database.newRig(rig.name).then(() => registerUnits(this.database));
			else registerUnits(this.database);
		});

		this.database.resolveProblem(rig.name);
	}

	private deregisterRig(socket: Socket){
		const i = this.rigs.findIndex((r) => r.socket === socket);
		if(i === -1) return;

		this.database.addProblem(this.rigs[i].rig.name);

		console.log("Deregistering %s: %s", socket.remoteAddress, this.rigs[i].rig.name);
		this.rigs.splice(i, 1);
	}
}