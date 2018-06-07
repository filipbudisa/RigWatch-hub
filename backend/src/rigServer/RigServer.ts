import {Database} from '../Database';
import * as net from 'net';
import {Server, Socket} from 'net';
import {ConnectedRig} from '../types/interface.ConnectedRig';
import {Rig} from '../types/interface.Rig';
import {DataParser} from './DataParser';
import {Unit} from '../types/interface.Unit';
import {DataClaymore} from '../types/data/interface.DataClaymore';

export class RigServer {
	private database: Database;
	private server: Server;

	private rigs: ConnectedRig[] = [];

	private readonly collectionInterval: number;

	public constructor(database: Database, collectionInterval: number){
		this.database = database;
		this.collectionInterval = collectionInterval;

		this.server = net.createServer(s => this.connection(s));
	}

	public listen(port: number, host: string, callback?: () => void){
		this.server.listen(port, host);
		callback();

		setInterval(() => this.collectData(), this.collectionInterval*1000*60);
	}

	public collectData(){
		this.database.createReport().then((report) => {
			const buf: Buffer = Buffer.allocUnsafe(5);
			buf.writeUInt8(0, 0);
			buf.writeUInt32LE(report, 1);

			console.log(buf);

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
			}else if(preData[0] === "data"){
				this.dataReport(parseFloat(preData[2]), rig);
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