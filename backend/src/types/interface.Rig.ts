import {Unit} from './interface.Unit';

export interface Rig {
	name: string;
	units?: Unit[];

	runtime?: number;
	shares?: number;

	hashrate?: number;

	nicename?: string;
}