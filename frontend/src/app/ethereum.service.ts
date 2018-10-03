import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";

@Injectable()
export class EthereumService {

	constructor(private http: HttpClient){ }

	public getPrice(): Promise<number> {
		return new Promise<number>((resolve) => {
			this.http.get("https://min-api.cryptocompare.com/data/price?fsym=ETH&tsyms=EUR")
				.subscribe((val: { EUR: number }) => {

					resolve(val.EUR);
			});
		});
	}

	public getPoints(limit: number): Promise<{ time: number, close: number }[]> {
		return new Promise<{ time: number, close: number }[]>((resolve) => {
			this.http.get("https://min-api.cryptocompare.com/data/histohour?fsym=ETH&tsym=EUR&limit=" + limit)
				.subscribe((val: { Data: { time: number, close: number }[] }) => {

				resolve(val.Data);
			});
		});
	}
}
