import { Injectable } from "@angular/core";
import { HttpClient, HttpErrorResponse, HttpEvent, HttpHeaders } from "@angular/common/http";
import { Router } from "@angular/router";
import "rxjs/add/operator/share";
import "rxjs/add/operator/publish";
import { ACObservable } from "./ACObservable";
import { Returnable } from "../../../backend/src/types/returnables/interface.Returnable";
import { RigsRet } from "../../../backend/src/types/returnables/interface.Rigs";
import { ChartRet } from "../../../backend/src/types/returnables/interface.Chart";
import { ChartParams } from "../../../backend/src/types/returnables/interface.ChartParams";
import { RigChartsRet } from "../../../backend/src/types/returnables/interface.RigCharts";
import { Coins } from "../../../backend/src/types/enum.Coins";
import { Rig } from "../../../backend/src/types/interface.Rig";
import { Situation } from "../../../backend/src/types/interface.Situation";
import { SituationReporting } from "../../../backend/src/types/interface.SituationReporting";


@Injectable()
export class BackendService {
	readonly domain: string;
	readonly options: any;

	static readonly messages: string[] = [
		"Uspjeh",		// 0
	];

	static readonly endpoints: any = {
		get_rigs: "/get_rigs",
		get_coin: "/get_rigs",
		set_coin: "/set_rigs",
		get_hashrate: "/get_hashrate",
		get_chart: "/get_chart",
		get_rig: "/get_rig",
		get_rig_numbers: "/get_rig_numbers",
		get_rig_charts: "/get_rig_charts",
		set_rig_nicename: "/set_rig_nicename",
		get_situations: "/get_situations",
		get_reporting: "/get_reporting",
		set_rig_reporting: "/set_rig_reporting",
		set_unit_reporting: "/set_unit_reporting",
		set_email: "/set_email",
		get_email: "/get_email"
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
			this.http.post(this.url(endpoint), data, this.options).publish());

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

	public getCoin(): ACObservable<Returnable & { coin: Coins }> {
		return this.checker(BackendService.endpoints.get_coin);
	}

	public setCoin(coin: Coins): ACObservable<void> {
		const data = { coin: coin };
		return this.checker(BackendService.endpoints.set_coin, data);
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

	public getSituations(page?: number): ACObservable<Returnable & { situations: Situation[], more: boolean }> {
		if(page === undefined) page = 0;
		const data = { page: page };
		return this.checker(BackendService.endpoints.get_situations, data);
	}

	public getReporting(): ACObservable<SituationReporting[]> {
		return this.checker(BackendService.endpoints.get_reporting);
	}

	public setRigReporting(enabled: boolean, time: number): ACObservable<Returnable> {
		const data: SituationReporting = { enabled: enabled, time: time, type: 0 };
		return this.checker(BackendService.endpoints.set_rig_reporting, data);
	}

	public setUnitReporting(enabled: boolean, time: number): ACObservable<Returnable> {
		const data: SituationReporting = { enabled: enabled, time: time, type: 1 };
		return this.checker(BackendService.endpoints.set_unit_reporting, data);
	}

	public getEmail(): ACObservable<Returnable & { email: string }> {
		return this.checker(BackendService.endpoints.get_email);
	}

	public setEmail(email: string): ACObservable<Returnable> {
		const data = { email: email };
		return this.checker(BackendService.endpoints.set_email, data);
	}
}