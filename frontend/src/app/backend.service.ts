import { Injectable } from "@angular/core";
import { HttpClient, HttpErrorResponse, HttpEvent, HttpHeaders } from "@angular/common/http";
import { Router } from "@angular/router";
import { ACObservable } from "./ACObservable";
import { Returnable } from "../../../backend/src/types/returnables/interface.Returnable";
import { RigsRet } from "../../../backend/src/types/returnables/interface.Rigs";
import { ChartRet } from "../../../backend/src/types/returnables/interface.Chart";
import { ChartParams } from "../../../backend/src/types/returnables/interface.ChartParams";
import { RigChartsRet } from "../../../backend/src/types/returnables/interface.RigCharts";
import { Rig } from "../../../backend/src/types/interface.Rig";
import { Problem } from "../../../backend/src/types/interface.Problem";
import { RigAutoReboot } from "../../../backend/src/types/interface.RigAutoReboot";
import { Settings } from "../../../backend/src/types/interface.Settings";
import { publish } from "rxjs/operators";
import { ConnectableObservable } from "rxjs/internal/observable/ConnectableObservable";


@Injectable()
export class BackendService {
	readonly domain: string;
	readonly options: any;

	static readonly messages: string[] = [
		"Uspjeh",		// 0
	];

	static readonly endpoints: any = {
		get_rigs: "/get_rigs",
		get_hashrate: "/get_hashrate",
		get_chart: "/get_chart",
		get_rig: "/get_rig",
		get_rig_numbers: "/get_rig_numbers",
		get_rig_charts: "/get_rig_charts",
		set_rig_nicename: "/set_rig_nicename",
		get_problems: "/get_problems",

		set_rig_power: "/set_rig_power",
		get_rig_autoreboot: "/get_rig_autoreboot",
		set_rig_autoreboot: "/set_rig_autoreboot",

		rig_restart: "/rig_restart",
		rig_reboot: "/rig_reboot",
		rig_delete: "/rig_delete",

		get_settings: "/get_settings",
		set_settings: "/set_settings",

		get_statistics: "/get_statistics"
	};

	public static getMessage(result: Returnable): string{
		if(result.code === -1){
			return result.message;
		}else{
			return BackendService.messages[ result.code ];
		}

	}

	private url(endpoint: string): string{
		return this.domain + endpoint;
	}

	constructor(private http: HttpClient, private router: Router){
		this.options = {
			headers: new HttpHeaders({ "Content-Type": "application/json" }),
			// withCredentials: true
		};

		this.domain = `http://${window.location.hostname}:8080`;
	}

	public error: HttpErrorResponse = undefined;
	public loading: boolean = false;

	private checker(endpoint: string, data?: any): ACObservable<any>{
		const result: ACObservable<any> = new ACObservable<any>(
			this.http.post(this.url(endpoint), data, this.options).pipe(publish()) as ConnectableObservable<any>);

		result.autoConnect(2);

		result.subscribe((d) =>{
			this.error = undefined;
			this.loading = false;
		}, (error: HttpErrorResponse) =>{
			console.log("eror");
			this.error = error;
			this.loading = false;
		});

		this.loading = true;

		return result;
	}

	public getRigs(): ACObservable<RigsRet> {
		return this.checker(BackendService.endpoints.get_rigs);
	}

	public getHashrate(): ACObservable<Returnable & { hashrate: number }>{
		return this.checker(BackendService.endpoints.get_hashrate);
	}

	public getChart(params: ChartParams): ACObservable<ChartRet> {
		return this.checker(BackendService.endpoints.get_chart, params);
	}

	public getRig(rig: string): ACObservable<Rig> {
		const data = { rig: rig };
		return this.checker(BackendService.endpoints.get_rig, data);
	}

	public getRigNumbers(rig: string): ACObservable<Rig> {
		const data = { rig: rig };
		return this.checker(BackendService.endpoints.get_rig_numbers, data);
	}

	public getRigCharts(params: ChartParams): ACObservable<RigChartsRet> {
		return this.checker(BackendService.endpoints.get_rig_charts, params);
	}

	public setRigNicename(rig: string, nicename: string): ACObservable<Returnable> {
		const data = { rig: rig, nicename: nicename };
		return this.checker(BackendService.endpoints.set_rig_nicename, data);
	}

	public getSituations(page?: number): ACObservable<Returnable & { problems: Problem[], more: boolean }> {
		if(page === undefined) page = 0;
		const data = { page: page };
		return this.checker(BackendService.endpoints.get_problems, data);
	}

	public setRigPower(rig: string, power: number){
		const data = { rig: rig, power: power };
		return this.checker(BackendService.endpoints.set_rig_power, data);
	}

	public getRigAutoreboot(rig: string): ACObservable<Returnable & { autoReboot: RigAutoReboot }> {
		const data = { rig: rig };
		return this.checker(BackendService.endpoints.get_rig_autoreboot, data);
	}

	public setRigAutoreboot(rig: string, autoReboot: any) {
		const data = { rig: rig, autoReboot: autoReboot };
		return this.checker(BackendService.endpoints.set_rig_autoreboot, data);
	}

	public rigRestart(rig: string){
		const data = { rig: rig };
		return this.checker(BackendService.endpoints.rig_restart, data);
	}

	public rigReboot(rig: string){
		const data = { rig: rig };
		return this.checker(BackendService.endpoints.rig_reboot, data);
	}

	public rigRemove(rig: string){
		const data = { rig: rig };
		return this.checker(BackendService.endpoints.rig_delete, data);
	}

	public getSettings(): ACObservable<Returnable & { settings: Settings }> {
		return this.checker(BackendService.endpoints.get_settings);
	}

	public setSettings(settings: Settings){
		return this.checker(BackendService.endpoints.set_settings, settings);
	}

	public getStatistics(params: ChartParams): ACObservable<Returnable & { stats: {
		rig: { rig_name: string, count: number }[],
		unit: { rig_name: string, unit_index: number, count: number }[],
		earnings: number }
	}>{
		return this.checker(BackendService.endpoints.get_statistics, params);
	}
}