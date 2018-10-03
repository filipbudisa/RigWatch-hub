import {ProblemReporting} from './interface.ProblemReporting';

export interface Settings {
	reportInterval: number;
	notifEmail: string;
	powerPrice: number;
	rigReporting: any; //ProblemReporting;
	unitReporting: any; //ProblemReporting;
}