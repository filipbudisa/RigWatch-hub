import {Returnable} from './interface.Returnable';
import {ChartPoint} from '../interface.ChartPoint';

export interface ChartRet extends Returnable {
	points: ChartPoint[];
}