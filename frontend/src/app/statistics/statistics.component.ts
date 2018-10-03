import { Component, OnInit } from "@angular/core";
import * as moment from "moment";
import { ChartParams } from "../../../../backend/src/types/returnables/interface.ChartParams";
import { BackendService } from "../backend.service";
import { DataStoreService } from "../dataStore.service";

@Component({
	selector: "app-statistics",
	templateUrl: "./statistics.component.html",
	styleUrls: [ "./statistics.component.css" ]
})
export class StatisticsComponent implements OnInit {

	public startDate: string;
	public endDate: string;

	public stats: {
		rig: { rig_name: string, count: number }[],
		unit: { rig_name: string, unit_index: number, count: number }[],
		earnings: number
	} = {
		rig: [],
		unit: [],
		earnings: 0
	};

	public rigF: number;
	public unitF: number;
	public perDay: number;
	public perWeek: number;

	constructor(private backend: BackendService, public dataStore: DataStoreService){ }

	ngOnInit(){
		this.endDate = moment().format("YYYY-MM-DDTHH:mm:ss");
		this.startDate = moment().subtract(1, "day").format("YYYY-MM-DDTHH:mm:ss");

		this.load();
	}

	load(){
		const momentStart = moment(this.startDate);
		const momentEnd = moment(this.endDate);

		const params: ChartParams = {
			start: momentStart.format("YYYY-MM-DD HH:mm:ss"),
			end: momentEnd.format("YYYY-MM-DD HH:mm:ss")
		};

		this.rigF = this.unitF = 0;

		this.backend.getStatistics(params).subscribe((res) => {
			this.stats = res.stats;

			this.stats.rig.forEach((s) => this.rigF += parseFloat("" + s.count));
			this.stats.unit.forEach((s) => this.unitF += parseFloat("" + s.count));

			const mins = momentEnd.diff(momentStart, "minutes", true);
			const epm = this.stats.earnings/mins;

			this.perDay = epm * 60*24;
			this.perWeek = this.perDay * 7;
		});
	}
}
