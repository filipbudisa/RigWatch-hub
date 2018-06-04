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

	public constructor(database: Database){
		this.database = database;

		this.server = net.createServer(s => this.connection(s));
	}

	public listen(port: number, host: string, callback?: () => void){
		this.server.listen(port, host);
		callback();
	}

	private connection(socket: Socket){
		console.log("Connection from %s", socket.remoteAddress);

		socket.on('data', (data) => {
			const rig: Rig = DataParser.parseData("" + data);
			let i = this.rigs.findIndex((r) => r.rig.name === rig.name);
			if(i === -1){
				this.registerRig(rig, socket);
				i = this.rigs.length-1;
			}

			if(this.rigs[i].socket !== socket) this.rigs[i].socket = socket;
		});

		// TODO: error handling
		socket.on('close', (he) => this.deregisterRig(socket));
		socket.on('end',() => this.deregisterRig(socket));
		socket.on('error', (err) => this.deregisterRig(socket));
		socket.on('timeout', () => this.deregisterRig(socket));
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

		console.log("New rig connected:");
		console.log(rig);
	}

	private deregisterRig(socket: Socket){
		const i = this.rigs.findIndex((r) => r.socket === socket);
		if(i !== -1) this.rigs.slice(i, 1);

		console.log(this.rigs);
	}
}