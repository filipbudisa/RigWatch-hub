import { Component, OnInit } from "@angular/core";
import { BackendService } from "../backend.service";
import { ActivatedRoute } from "@angular/router";
import { Rig } from "../../../../backend/src/types/interface.Rig";
import { DataStoreService } from "../dataStore.service";
import * as moment from "moment";
import { OverviewComponent } from "../overview/overview.component";


@Component({
	selector: "app-rig",
	templateUrl: "./rig.component.html",
	styleUrls: [ "./rig.component.css" ]
})
export class RigComponent implements OnInit {
	public rig: Rig = { name: "", nicename: "", units: [] };
	public offline: boolean = false;

	public chData: { x: string, y: number }[] = [];
	public chHashrates: { x: string, y: number }[][] = [];
	public chTemps: { x: string, y: number }[][] = [];
	public chLoaded: boolean = false;

	public readonly chOptions = OverviewComponent.chOptions;

	public showSettings: boolean = false;
	public settingsWorking: boolean = false;
	public nicename: string = "";

	constructor(private backend: BackendService, private route: ActivatedRoute, private dataStore: DataStoreService){ }

	ngOnInit(){
		this.route.paramMap.subscribe(params => {
			this.offline = false;
			this.rig = { name: params.get("rig"), units: [] };
			this.rig.nicename = this.nicename = this.dataStore.getRigNicename(this.rig.name);

			this.chData = [];
			this.chHashrates = [];
			this.chTemps = [];
			this.chLoaded = false;
			
			this.loadRig();
		});
	}

	private loadRig(){
		this.backend.getRig(this.rig.name).subscribe((rig: Rig) => {
			this.offline = rig.hashrate === null;

			this.rig = rig;
			this.rig.nicename = this.nicename = this.dataStore.getRigNicename(this.rig.name);
		});

		const start = moment().format("YYYY-MM-DD HH:mm:ss");
		const end = moment().subtract(1, "day").format("YYYY-MM-DD HH:mm:ss");

		this.backend.getRigCharts({ start: start, end: end, rig: this.rig.name }).subscribe((data) => {
			console.log(data);

			data.chart.forEach((p) => {
				this.chData.push({ x: p.time, y: p.value });
			});

			data.units.forEach((u) => {
				const hPoints: { x: string, y: number }[] = [];
				const tPoints: { x: string, y: number }[] = [];

				u.hashrateChart.forEach(p => hPoints.push({ x: p.time, y: p.value }));
				u.tempChart.forEach(p => tPoints.push({ x: p.time, y: p.value }));

				this.chHashrates.push(hPoints);
				this.chTemps.push(tPoints);
			});

			console.log(this.rig.units);

			this.chLoaded = true;
		});
	}

	setNicename(){
		if(this.settingsWorking) return;
		this.settingsWorking = true;

		this.backend.setRigNicename(this.rig.name, this.nicename).subscribe(() => {
			this.settingsWorking = this.showSettings = false;
			this.dataStore.rigs.find((r) => r.name === this.rig.name).nicename = this.rig.nicename = this.nicename;
		});
	}
}
