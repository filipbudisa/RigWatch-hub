import { Component, OnInit } from "@angular/core";
import { Situation } from "../../../../backend/src/types/interface.Situation";
import { BackendService } from "../backend.service";
import { DataStoreService } from "../dataStore.service";
import * as moment from "moment";

@Component({
	selector: "app-situations",
	templateUrl: "./situations.component.html",
	styleUrls: [ "./situations.component.css" ]
})
export class SituationsComponent implements OnInit {
	public showSettings: boolean = false;
	public settingsWorking = false;

	public situations: Situation[] = [];
	public more: boolean = false;
	private page: number = -1;

	public email: string = "";

	private moment;

	constructor(private backend: BackendService, public dataStore: DataStoreService){
		this.moment = moment;
	}

	ngOnInit(){
		this.loadSituations();

		this.backend.getEmail().subscribe((data: { email: string }) => {
			this.email = data.email;
		});
	}

	setEmail(){
		if(this.settingsWorking) return;
		this.settingsWorking = true;

		this.backend.setEmail(this.email).subscribe(() => {
			this.settingsWorking = this.showSettings = false;
		});
	}

	public loadSituations(){
		this.backend.getSituations(++this.page).subscribe((res) => {
			this.situations = this.situations.concat(res.situations);
			this.more = res.more;
		});
	}
}
