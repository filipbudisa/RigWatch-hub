import {Unit} from './interface.Unit';

export interface Rig {
	name: string;
	units?: Unit[];
	nicename?: string;

	hashrate?: number;
	power?: number;

	// runtime?: number;
	// shares?: number;
}