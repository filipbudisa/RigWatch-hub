import {ConnectableObservable, Subscription} from 'rxjs';

export class ACObservable<T> {
	private cons: number;
	private numCons: number;
	private observable: ConnectableObservable<T>;


	constructor(observable: ConnectableObservable<T>) {
		this.observable = observable;
	}

	public autoConnect(numCons: number): void {
		this.cons = 0;
		this.numCons = numCons;
	}

	public subscribe(next?: (value: T) => void, error?: (error: any) => void, complete?: () => void): Subscription {
		let sub: Subscription = this.observable.subscribe(next, error, complete);

		if(++(this.cons) == this.numCons) this.observable.connect();

		return sub;
	}
}