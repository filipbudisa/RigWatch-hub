import {Returnable} from './interface.Returnable';
import {ChartPoint} from '../interface.ChartPoint';

export interface RigChartsRet extends Returnable {
	chart: ChartPoint[];
	units: {
		tempChart: ChartPoint[];
		hashrateChart: ChartPoint[];
	}[];
}