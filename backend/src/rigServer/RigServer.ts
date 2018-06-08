import {Database} from '../Database';
import * as net from 'net';
import {Server, Socket} from 'net';
import {ConnectedRig} from '../types/interface.ConnectedRig';
import {Rig} from '../types/interface.Rig';
import {DataParser} from './DataParser';
import {Unit} from '../types/interface.Unit';
import Timer = NodeJS.Timer;

export class RigServer {
	private database: Database;
	private server: Server;

	private rigs: ConnectedRig[] = [];
	private dataRequests: { id: number, callback: (Rig) => void, timeout: Timer }[] = [];

	private readonly collectionInterval: number;

	public constructor(database: Database, collectionInterval: number){
		this.database = database;
		this.collectionInterval = collectionInterval;

		this.server = net.createServer(s => this.connection(s));
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

		console.log(buf);

		this.rigs[i].socket.write(buf);
	}

	public getTotalHashrate(callback: (number) => void){
		let hashrate = 0;
		let noData = 0;
		const totalData = this.rigs.length;

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

		setInterval(() => this.collectData(), this.collectionInterval*1000*60);
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

			console.log("Pre: " + preData);

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
		});

		// TODO: error handling
		socket.on('close', (he) => this.deregisterRig(socket));
		socket.on('end',() => this.deregisterRig(socket));
		socket.on('error', (err) => this.deregisterRig(socket));
		socket.on('timeout', () => this.deregisterRig(socket));

		setTimeout(() => this.collectData(), 5000);
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
					else if(units[i].make !== unit.make || units[i].model !== unit.model || units[i].type !== unit.type)
						db.updateUnit(rig.name, i, unit);
				});
			});
		}

		this.database.getRig(rig.name).then((dbRig: Rig) => {
			if(dbRig === null) this.database.newRig(rig.name).then(() => registerUnits(this.database));
			else registerUnits(this.database);
		});
	}

	private deregisterRig(socket: Socket){
		const i = this.rigs.findIndex((r) => r.socket === socket);
		if(i !== -1){
			console.log("Deregistering %s: %s", socket.remoteAddress, this.rigs[i].rig.name);
			this.rigs.splice(i, 1);
		}
	}
}