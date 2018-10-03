import { Component, OnInit } from "@angular/core";
import { BackendService } from "../backend.service";
import { ActivatedRoute, Router } from "@angular/router";
import { Rig } from "../../../../backend/src/types/interface.Rig";
import { DataStoreService } from "../dataStore.service";
import * as moment from "moment";
import { ChartParams } from "../../../../backend/src/types/returnables/interface.ChartParams";
import { RigAutoReboot } from "../../../../backend/src/types/interface.RigAutoReboot";


@Component({
	selector: "app-rig",
	templateUrl: "./rig.component.html",
	styleUrls: [ "./rig.component.css" ]
})
export class RigComponent implements OnInit {
	public rig: Rig = { name: "", nicename: "", units: [], power: 0 };
	public offline: boolean = false;

	public chData: { x: string, y: number }[] = [];
	public zData: { x: string, y: number }[] = [];

	public chHashrates: { x: string, y: number }[][] = [];
	public chTemps: { x: string, y: number }[][] = [];

	public showSettings: boolean = false;
	public settingsWorking: boolean = false;
	public nicename = "";
	public rigAutoreboot: RigAutoReboot = { no_cards: 0, time: 10 };
	public rigAutorebootEnabled: boolean = false;
	public rigPower: number = 0;

	public rigCost: number;
	public netWorth: number;

	public startDate: string = "";
	public endDate: string = "";

	constructor(private backend: BackendService, private route: ActivatedRoute,
		private dataStore: DataStoreService, private router: Router){ }

	ngOnInit(){
		this.route.paramMap.subscribe(params => {
			this.offline = false;

			this.rig = { name: params.get("rig"), units: [] };
			this.rig.nicename = this.nicename = this.dataStore.getRigNicename(this.rig.name);

			this.rigAutoreboot = { no_cards: 0, time: 10 };
			this.rigAutorebootEnabled = false;
			this.rigPower = 0;

			this.chData = [];
			this.chHashrates = [];
			this.chTemps = [];
			this.zData = [];

			this.endDate = moment().format("YYYY-MM-DDTHH:mm:ss");
			this.startDate = moment().subtract(1, "day").format("YYYY-MM-DDTHH:mm:ss");

			this.loadRig();
		});
	}

	private loadRig(){
		this.backend.getRig(this.rig.name).subscribe((rig: Rig) => {
			this.offline = rig.hashrate === null;

			this.rig = rig;
			this.rig.nicename = this.nicename = this.dataStore.getRigNicename(this.rig.name);
			this.rigPower = this.rig.power;
		});

		this.backend.getRigAutoreboot(this.rig.name).subscribe((data) => {
			this.rigAutoreboot = data.autoReboot;
			this.rigAutorebootEnabled = data.autoReboot.time !== undefined && data.autoReboot.no_cards !== undefined;
		});

		this.loadCharts();
	}

	loadCharts(){
		this.chData = [];

		const momentStart = moment(this.startDate);
		const momentEnd = moment(this.endDate);

		const params: ChartParams = {
			start: momentStart.format("YYYY-MM-DD HH:mm:ss"),
			end: momentEnd.format("YYYY-MM-DD HH:mm:ss"),
			rig: this.rig.name
		};

		this.backend.getRigCharts(params).subscribe((data) => {
			data.chart.forEach((p) => {
				this.chData.push({ x: p.time, y: p.value });
			});

			if(data.chart.length === 0) this.chData.push({ x: moment().format("YYYY-MM-DD HH:mm:ss"), y: this.rig.hashrate });

			data.units.forEach((u) => {
				const hPoints: { x: string, y: number }[] = [];
				const tPoints: { x: string, y: number }[] = [];

				u.hashrateChart.forEach(p => hPoints.push({ x: p.time, y: p.value }));
				u.tempChart.forEach(p => tPoints.push({ x: p.time, y: p.value }));

				if(u.hashrateChart.length === 0) hPoints.push({ x: moment().format("YYYY-MM-DD HH:mm:ss"), y: 0 });
				if(u.tempChart.length === 0) hPoints.push({ x: moment().format("YYYY-MM-DD HH:mm:ss"), y: 0 });

				this.chHashrates.push(hPoints);
				this.chTemps.push(tPoints);
			});

			this.loadEarningsChart();
		});
	}

	loadEarningsChart(){
		this.backend.getSettings().subscribe((s) => {
			const kwh = s.settings.powerPrice;
			this.rigCost = Math.round(24 * kwh * this.rigPower) / 1000;

			this.chData.forEach((d) => {
				const earnings = 0.02897739785300082 * (d.y/1000) + 0.0007991005829243384;
				this.zData.push({ x: d.x, y: earnings-this.rigCost });
			});

			this.netWorth = 0.02897739785300082 * (this.rig.hashrate/1000) + 0.0007991005829243384 - this.rigCost;
		});
	}

	saveSettings(){
		if(this.settingsWorking) return;
		this.settingsWorking = true;

		let done = 0;

		this.backend.setRigAutoreboot(this.rig.name, this.rigAutorebootEnabled ? this.rigAutoreboot : {}).subscribe(() => {
			this.settingsWorking = ++done < 3;
			console.log(done);
		});

		this.backend.setRigNicename(this.rig.name, this.nicename).subscribe(() => {
			this.rig.nicename = this.nicename;
			this.dataStore.rigs.find((r) => r.name === this.rig.name).nicename = this.nicename;

			this.settingsWorking = ++done < 3;
			console.log(done);
		});

		this.backend.setRigPower(this.rig.name, this.rigPower).subscribe(() => {
			this.rig.power = this.rigPower;
			this.loadEarningsChart();

			this.settingsWorking = ++done < 3;
			console.log(done);
		});
	}

	restart(){
		if(!confirm("Restart mining program?")) return;
		this.backend.rigRestart(this.rig.name).subscribe();
	}

	reboot(){
		if(!confirm("Reboot rig?")) return;
		this.backend.rigReboot(this.rig.name).subscribe(() => {
			this.offline = true;
			this.loadRig();
		});
	}

	remove(){
		if(!confirm("Remove rig from system?")) return;
		this.backend.rigRemove(this.rig.name).subscribe(() => {
			this.dataStore.updateRigs();
			this.router.navigate(["/"]);
		});
	}
}
