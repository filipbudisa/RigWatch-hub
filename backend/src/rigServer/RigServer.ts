import {Database} from '../Database';
import * as net from 'net';
import {Server, Socket} from 'net';
import {ConnectedRig} from '../types/interface.ConnectedRig';
import {Rig} from '../types/interface.Rig';
import {DataParser} from './DataParser';
import {Unit} from '../types/interface.Unit';

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
		this.rigs.forEach((rig) => {
			const buf: Buffer = new Buffer([0]);
			rig.socket.write(buf);
		});
	}

	private connection(socket: Socket){
		console.log("Connection from %s", socket.remoteAddress);

		socket.on('data', (data) => {
			let reg = false;

			const rig: Rig = DataParser.parseData("" + data);
			let i = this.rigs.findIndex((r) => r.rig.name === rig.name);
			if(i === -1){
				this.registerRig(rig, socket);
				i = this.rigs.length-1;
				reg = true;
			}

			if(this.rigs[i].socket !== socket) this.rigs[i].socket = socket;

			if(!reg) this.dataReport(rig);
		});

		// TODO: error handling
		socket.on('close', (he) => this.deregisterRig(socket));
		socket.on('end',() => this.deregisterRig(socket));
		socket.on('error', (err) => this.deregisterRig(socket));
		socket.on('timeout', () => this.deregisterRig(socket));
	}

	private dataReport(rig: Rig){
		console.log("Receiving report");
		this.database.addReport(rig);
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
					else if(units[i].make !== unit.make || units[i].model !== unit.model || units[i].type != unit.type)
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