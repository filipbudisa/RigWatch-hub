import { Component, OnInit } from "@angular/core";
import { DataStoreService } from "../dataStore.service";

@Component({
	selector: "app-sidebar",
	templateUrl: "./sidebar.component.html",
	styleUrls: [ "./sidebar.component.css" ]
})
export class SidebarComponent implements OnInit {
	constructor(public dataStore: DataStoreService){ }

	ngOnInit(){
		this.dataStore.updateRigs();
	}
}
