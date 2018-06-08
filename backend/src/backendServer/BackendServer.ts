import * as restify from 'restify';
import {Next, Request, Response, Server} from 'restify';
import {Database} from '../Database';
import {RigServer} from '../rigServer/RigServer';
import {Rig} from '../types/interface.Rig';
import {RigsRet} from '../types/returnables/interface.Rigs';
import {ChartParams} from '../types/returnables/interface.ChartParams';
import {Unit} from '../types/interface.Unit';
import {ChartPoint} from '../types/interface.ChartPoint';
import {RigChartsRet} from '../types/returnables/interface.RigCharts';
import {Returnable} from '../types/returnables/interface.Returnable';
import {Coins} from '../types/enum.Coins';
import {ChartRet} from '../types/returnables/interface.Chart';

export class BackendServer {
	private database: Database;
	private rigServer: RigServer;
	private server: Server;


	constructor(database: Database, rigServer: RigServer) {
		this.database = database;
		this.rigServer = rigServer;

		this.server = restify.createServer();
		this.server.use(restify.plugins.jsonBodyParser());

		this.setupRoutes();
	}

	public listen(port: number, callback?: () => void){
		this.server.listen(port, callback);
	}

	private setupRoutes(){
		this.server.post("/get_rigs", (req, res, next) => this.routeGetRigs(req, res, next));
		this.server.post("/get_coin", (req, res, next) => this.routeGetCoin(req, res, next));
		this.server.post("/set_coin", (req, res, next) => this.routeSetCoin(req, res, next));
		this.server.post("/get_hashrate", (req, res, next) => this.routeGetHashrate(req, res, next));
		this.server.post("/get_chart", (req, res, next) => this.routeGetGraph(req, res, next));
		this.server.post("/get_rig_numbers", (req, res, next) => this.routeGetRigNumbers(req, res, next));
		this.server.post("/get_rig_charts", (req, res, next) => this.routeGetRigCharts(req, res, next));
		this.server.post("/set_rig_nicename", (req, res, next) => this.routeSetRigNicename(req, res, next));
	}

	private routeGetRigs(req: Request, res: Response, next: Next){
		this.database.getRigs().then((rigs: Rig[]) => {
			res.send(<RigsRet> {
				code: 0,
				rigs: rigs
			});
		});
	}

	private routeGetCoin(req: Request, res: Response, next: Next){
		this.database.getSetting("coin").then((coin: Coins) => {
			res.send(<Returnable> { code: 0, coin: coin });
		});
	}

	private routeSetCoin(req: Request, res: Response, next: Next){
		const body: { coin: Coins } = req.body;

		this.database.setSetting("coin", body.coin).then(() => {
			res.send(<Returnable> { code: 0 });
		});
	}

	private routeGetHashrate(req: Request, res: Response, next: Next){
		this.rigServer.getTotalHashrate((hashrate: number) => {
			res.send(<Returnable> { code: 0, hashrate: hashrate });
		});
	}

	private routeGetGraph(req: Request, res: Response, next: Next){
		const body: ChartParams = req.body;
		this.database.getChartHashrate(body.start, body.end).then((points: ChartPoint[]) => {
			res.send(<ChartRet> { code: 0, points: points });
		});
	}

	private routeGetRigNumbers(req: Request, res: Response, next: Next){
		const body: { rig: string } = req.body;

		this.rigServer.getRigData(body.rig, (rig: Rig) => {
			res.send(rig);
		});
	}

	private routeGetRigCharts(req: Request, res: Response, next: Next) {
		const body = <ChartParams> req.body;

		const data: RigChartsRet = {
			code: 0,
			chart: null,
			units: []
		};

		let dataCount = 0;
		let reqDataCount = 2;

		this.database.getRigChartHashrate(body.start, body.end, body.rig).then((points: ChartPoint[]) => {
			data.chart = points;
			if(++dataCount === reqDataCount) res.send(data);
		});

		this.database.rigGetUnits(body.rig).then((units: Unit[]) => {
			reqDataCount += 2*units.length - 1;

			for(let i = 0; i < units.length; i++){
				data.units[i] = { tempChart: null, hashrateChart: null };

				this.database.getUnitChartHashrate(body.start, body.end, body.rig, i).then((points: ChartPoint[]) => {
					data.units[i].hashrateChart = points;
					if(++dataCount === reqDataCount) res.send(data);
				});
				this.database.getUnitChartTemp(body.start, body.end, body.rig, i).then((points: ChartPoint[]) => {
					data.units[i].tempChart = points;
					if(++dataCount === reqDataCount) res.send(data);
				});
			}
		});
	}

	private routeSetRigNicename(req: Request, res: Response, next: Next){
		const body: { rig: string, nicename: string } = req.body;

		this.database.setRigNicename(body.rig, body.nicename).then(() => res.send(<Returnable> { code: 0 }));
	}
}
