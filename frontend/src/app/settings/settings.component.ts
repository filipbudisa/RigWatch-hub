import { Component, OnInit } from "@angular/core";
import { Settings } from "../../../../backend/src/types/interface.Settings";
import { BackendService } from "../backend.service";

@Component({
	selector: "app-settings",
	templateUrl: "./settings.component.html",
	styleUrls: [ "./settings.component.css" ]
})
export class SettingsComponent implements OnInit {
	public settings: Settings = {
		rigReporting: { enabled: false, type: 0 },
		unitReporting: { enabled: false, type: 1 },
		reportInterval: 0,
		powerPrice: 0,
		notifEmail: ""
	};

	public working: boolean = false;

	constructor(private backend: BackendService){ }

	ngOnInit(){
		this.backend.getSettings().subscribe((data) => {
			this.settings = data.settings;

			try{
				this.settings.rigReporting = JSON.parse(this.settings.rigReporting);
				this.settings.unitReporting = JSON.parse(this.settings.unitReporting);
			}catch(e){

			}
		});
	}

	saveSettings(){
		if(this.working) return;
		this.working = true;

		this.backend.setSettings(this.settings).subscribe(() => {
			this.working = false;
		});
	}
}
