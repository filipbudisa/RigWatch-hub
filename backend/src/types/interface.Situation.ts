export interface Situation {
	id: number;

	/** 0 - rig death, 1 - unit death */
	type: number;

	rig: string;
	unit?: number;
	time: string;
	resolved?: string;
	dismissed: boolean;
}