import { Component, OnInit } from "@angular/core";
import { ChartParams } from "../../../../backend/src/types/returnables/interface.ChartParams";
import { BackendService } from "../backend.service";
import * as moment from "moment";
import { EthereumService } from "../ethereum.service";
import { DataStoreService } from "../dataStore.service";

@Component({
	selector: "app-overview",
	templateUrl: "./overview.component.html",
	styleUrls: [ "./overview.component.css" ]
})
export class OverviewComponent implements OnInit {
	public hashrate: number;
	public chData: { x: string, y: number }[];

	public ethPrice: number;
	public ethData: { x: string, y: number }[];

	public zData: { x: string, y: number }[];
	public netWorth: number;

	public startDate: string = "";
	public endDate: string = "";

	constructor(private backend: BackendService, private eth: EthereumService, private dataStore: DataStoreService){ }

	ngOnInit(){
		this.endDate = moment().format("YYYY-MM-DDTHH:mm:ss");
		this.startDate = moment().subtract(1, "day").format("YYYY-MM-DDTHH:mm:ss");

		this.backend.getHashrate().subscribe((data) => {
			this.hashrate = data.hashrate;
		});

		this.eth.getPrice().then((price: number) => this.ethPrice = price);

		this.loadCharts();
	}

	loadCharts(){
		const momentStart = moment(this.startDate);
		const momentEnd = moment(this.endDate);

		const params: ChartParams = {
			start: momentStart.format("YYYY-MM-DD HH:mm:ss"),
			end: momentEnd.format("YYYY-MM-DD HH:mm:ss")
		};

		this.chData = this.ethData = this.zData = [];

		this.backend.getChart(params).subscribe((data) => {
			data.points.forEach((p) => {
				this.chData.push({ x: p.time, y: Math.max(p.value, 0) });
			});

			this.loadNetworth();
		});

		const hours = momentEnd.diff(momentStart, "hours", true);
		this.eth.getPoints(Math.max(hours, 1)).then((data) => {
			this.ethData = [];

			data.forEach((point) => {
				this.ethData.push({ x: moment.unix(point.time).format("YYYY-MM-DD HH:mm:ss"), y: point.close });
			});
		});
	}

	loadNetworth(){
		let cost: number = 0;
		let rigs: number = 0;

		this.backend.getSettings().subscribe((s) => {
			const kwh = s.settings.powerPrice;

			this.dataStore.rigs.forEach((r) => {
				this.backend.getRig(r.name).subscribe((rig) => {
					cost += Math.round(24 * kwh * rig.power) / 1000;

					if(++rigs === this.dataStore.rigs.length){
						this.zData = [];
						this.chData.forEach((d) => {
							const earnings = 0.02897739785300082 * (d.y/1000) + 0.0007991005829243384;
							this.zData.push({ x: d.x, y: earnings-cost });
						});

						this.netWorth = 0.02897739785300082 * (this.hashrate/1000) + 0.0007991005829243384 - cost;
					}
				});
			});
		});
	}
}
