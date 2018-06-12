import { Injectable } from "@angular/core";
import { Rig } from "../../../backend/src/types/interface.Rig";
import { BackendService } from "./backend.service";

@Injectable()
export class DataStoreService {
	public rigs: Rig[] = [];

	constructor(private backend: BackendService){}

	public updateRigs(){
		this.backend.getRigs().subscribe((res) => {
			this.rigs = res.rigs;

			this.rigs.forEach((r) => {
				if(r.nicename === null) r.nicename = r.name;
			});
		});
	}

	public getRigNicename(rig: string){
		const i = this.rigs.findIndex((r) => r.name === rig);
		if(i === -1) return rig;
		return this.rigs[i].nicename;
	}
}