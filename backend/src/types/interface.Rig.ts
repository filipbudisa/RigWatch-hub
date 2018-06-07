import {Unit} from './interface.Unit';

export interface Rig {
	name: string;
	units?: Unit[];

	runtime?: number;
	hashrate?: number;
	shares?: number;

	nicename?: string;
}