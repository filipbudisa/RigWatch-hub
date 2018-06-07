import {Returnable} from './interface.Returnable';
import {Coins} from '../enum.Coins';
import {ChartPoint} from '../interface.ChartPoint';

export interface OverviewRet extends Returnable {
	hashrate: number;
	coin: Coins;
	graph: ChartPoint[];
}