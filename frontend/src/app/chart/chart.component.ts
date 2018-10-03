import { Component, Input, OnInit, Output, ViewEncapsulation } from "@angular/core";

@Component({
	selector: "rw-chart",
	templateUrl: "./chart.component.html",
	styleUrls: [ "./chart.component.css" ]
})
export class ChartComponent implements OnInit {

	public readonly options: any = {
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
				borderWidth: 1,
				spanGaps: false
			}
		}
	};

	@Input() data: { x: string, y: number }[] = [];
	constructor(){ }

	ngOnInit(){
	}

}
