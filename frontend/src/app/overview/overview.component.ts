import { Component, OnInit } from "@angular/core";
import { ChartPoint } from "../../../../backend/src/types/interface.ChartPoint";
import { BackendService } from "../backend.service";
import * as moment from "moment";

@Component({
	selector: "app-overview",
	templateUrl: "./overview.component.html",
	styleUrls: [ "./overview.component.css" ]
})
export class OverviewComponent implements OnInit {
	public hashrate: number;
	public chData: { x: string, y: number }[];
	public chLoaded: boolean = false;

	public get chOptions(){ return OverviewComponent.chOptions; }
	public static readonly chOptions: any = {
		label: "",
		scales: {
			yAxes: [{
				ticks: { beginAtZero: true },
				gridLines: {
					display: false
				},
				scaleLabel: {
					display: false
				}
			}],
			xAxes: [{
				type: "time",
				time: {
					tooltipFormat: "LLL",
					minUnit: "minute"
				},
				gridLines: {
					display: false
				},
				scaleLabel: {
					display: false
				}
			}]
		},
		legend: {
			display: false
		},
		tooltips: {
			titleFontFamily: '"Open Sans", sans-serif',
			titleFontSize: 16,
			titleSpacing: 0,


			bodyFontFamily: '"Open Sans", sans-serif',
			bodyFontSize: 14,
			bodySpacing: 0,

			footerSpacing: 0,
			footerMarginTop: 0,

			caretSize: 0,
			cornerRadius: 0,
			xPadding: 10,
			yPadding: 10,
			displayColors: false,

			intersect: false
		},
		elements: {
			point:{
				radius: 0,
				hitRadius: 0,
				hoverRadius: 0,
				hoverBorderWidth: 0
			},
			line: {
				tension: 0,
				fill: false,
				borderColor: "rgba(255, 94, 255, 1)",
				borderWidth: 1
			}
		}
	};

	public showSettings: boolean = false;

	constructor(private backend: BackendService){ }

	ngOnInit(){
		this.backend.getHashrate().subscribe((data) => {
			this.hashrate = data.hashrate;
		});

		const start = moment().format("YYYY-MM-DD HH:mm:ss");
		const end = moment().subtract(1, "day").format("YYYY-MM-DD HH:mm:ss");

		this.backend.getChart({ start: start, end: end }).subscribe((data) => {
			this.chData = [];

			data.points.forEach((p) => {
				this.chData.push({ x: p.time, y: p.value });
			});

			this.chLoaded = true;
		});
	}

	setNicename(){

	}
}
