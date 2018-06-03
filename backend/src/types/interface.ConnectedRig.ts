import {Rig} from './interface.Rig';
import {Socket} from 'net';

export interface ConnectedRig {
	socket: Socket;
	rig: Rig;
}