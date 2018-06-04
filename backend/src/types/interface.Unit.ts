import {UnitType} from './enum.UnitType';
import {UnitMake} from './enum.UnitMake';

export interface Unit {
	type: UnitType;
	make: UnitMake;
	model: string;

	temp?: number;
	hashrate?: number;
}