import { Component, OnInit } from "@angular/core";
import { Problem } from "../../../../backend/src/types/interface.Problem";
import { BackendService } from "../backend.service";
import { DataStoreService } from "../dataStore.service";
import * as moment from "moment";

@Component({
	selector: "app-situations",
	templateUrl: "./problems.component.html",
	styleUrls: [ "./problems.component.css" ]
})
export class ProblemsComponent implements OnInit {
	public problems: Problem[] = [];
	public more: boolean = false;
	private page: number = -1;

	private moment;

	constructor(private backend: BackendService, public dataStore: DataStoreService){
		this.moment = moment;
	}

	ngOnInit(){
		this.loadSituations();
	}

	public loadSituations(){
		this.backend.getSituations(++this.page).subscribe((res) => {
			res.problems.forEach((p) => {
				p.rig_name = this.dataStore.getRigNicename(p.rig_name);
			});

			this.problems = this.problems.concat(res.problems);
			this.more = res.more;
		});
	}
}
