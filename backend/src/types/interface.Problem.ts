export interface Problem {
	id: number;

	/** 0 - rig death, 1 - unit death */
	type: number;

	rig_name: string;
	unit_index?: number;
	time: string;
	resolved?: string;
	dismissed: boolean;
}