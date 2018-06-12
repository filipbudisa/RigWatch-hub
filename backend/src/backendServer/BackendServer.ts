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
import corsMiddleware = require('restify-cors-middleware');
import {Situation} from '../types/interface.Situation';
import {SituationReporting} from '../types/interface.SituationReporting';

export class BackendServer {
	private database: Database;
	private rigServer: RigServer;
	private server: Server;

	private readonly cors = corsMiddleware({
		origins: ['http://rig.sprint.ninja:4200', 'http://rig.sprint.ninja', 'http://localhost:4200', 'http://localhost'],
		allowHeaders: ['API-Token'],
		exposeHeaders: ['API-Token-Expiry']
	});


	constructor(database: Database, rigServer: RigServer) {
		this.database = database;
		this.rigServer = rigServer;

		this.server = restify.createServer();
		this.server.pre(this.cors.preflight);
		this.server.use(this.cors.actual);
		this.server.use(restify.plugins.jsonBodyParser());

		this.setupRoutes();
	}

	public listen(port: number, callback?: () => void) {
		this.server.listen(port, callback);
	}

	private setupRoutes() {
		this.server.post('/get_rigs', (req, res, next) => this.routeGetRigs(req, res, next));
		this.server.post('/get_coin', (req, res, next) => this.routeGetCoin(req, res, next));
		this.server.post('/set_coin', (req, res, next) => this.routeSetCoin(req, res, next));
		this.server.post('/get_hashrate', (req, res, next) => this.routeGetHashrate(req, res, next));
		this.server.post('/get_chart', (req, res, next) => this.routeGetGraph(req, res, next));
		this.server.post('/get_rig', (req, res, next) => this.routeGetRig(req, res, next));
		this.server.post('/get_rig_numbers', (req, res, next) => this.routeGetRigNumbers(req, res, next));
		this.server.post('/get_rig_charts', (req, res, next) => this.routeGetRigCharts(req, res, next));
		this.server.post('/set_rig_nicename', (req, res, next) => this.routeSetRigNicename(req, res, next));
		this.server.post('/get_situations', (req, res, next) => this.routeGetSituations(req, res, next));
		this.server.post('/get_reporting', (req, res, next) => this.getReporting(req, res, next));
		this.server.post('/set_rig_reporting', (req, res, next) => this.setRigReporting(req, res, next));
		this.server.post('/set_unit_reporting', (req, res, next) => this.setUnitReporting(req, res, next));
		this.server.post('/set_email', (req, res, next) => this.setEmail(req, res, next));
		this.server.post('/get_email', (req, res, next) => this.getEmail(req, res, next));
	}

	private routeGetRigs(req: Request, res: Response, next: Next) {
		this.database.getRigs().then((rigs: Rig[]) => {
			res.send(<RigsRet> {
				code: 0,
				rigs: rigs
			});
		});
	}

	private routeGetCoin(req: Request, res: Response, next: Next) {
		this.database.getSetting('coin').then((coin: Coins) => {
			res.send(<Returnable> {code: 0, coin: coin});
		});
	}

	private routeSetCoin(req: Request, res: Response, next: Next) {
		const body: { coin: Coins } = req.body;

		this.database.setSetting('coin', body.coin).then(() => {
			res.send(<Returnable> {code: 0});
		});
	}

	private routeGetHashrate(req: Request, res: Response, next: Next) {
		this.rigServer.getTotalHashrate((hashrate: number) => {
			res.send(<Returnable> {code: 0, hashrate: hashrate});
		});
	}

	private routeGetGraph(req: Request, res: Response, next: Next) {
		const body: ChartParams = req.body;
		this.database.getChartHashrate(body.start, body.end).then((points: ChartPoint[]) => {
			res.send(<ChartRet> {code: 0, points: points});
		});
	}

	private routeGetRigNumbers(req: Request, res: Response, next: Next) {
		const body: { rig: string } = req.body;

		this.rigServer.getRigData(body.rig, (rig: Rig) => {
			res.send(rig);
		});
	}

	private routeGetRig(req: Request, res: Response, next: Next) {
		const body: { rig: string } = req.body;

		if(this.rigServer.checkRig(body.rig)){
			let retRig: Rig = { name: null, hashrate: null };

			this.database.getRig(body.rig).then((rig: Rig) => {
				if(retRig.hashrate !== null){
					retRig.nicename = rig.nicename;
					res.send(retRig);
				}else{
					retRig = rig;
				}
			});

			this.rigServer.getRigData(body.rig, (rig: Rig) => {
				if(retRig.name !== null){
					rig.nicename = retRig.nicename;
					res.send(rig);
				}else{
					retRig = rig;
				}
			});
			return;
		}

		this.database.getRig(body.rig).then((rig: Rig) => {
			this.database.rigGetUnits(rig.name).then((units: Unit[]) => {
				rig.units = units;
				rig.hashrate = null;

				res.send(rig);
			});
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
			if (++dataCount === reqDataCount) res.send(data);
		});

		this.database.rigGetUnits(body.rig).then((units: Unit[]) => {
			reqDataCount += 2 * units.length - 1;

			for (let i = 0; i < units.length; i++) {
				data.units[i] = {tempChart: null, hashrateChart: null};

				this.database.getUnitChartHashrate(body.start, body.end, body.rig, i).then((points: ChartPoint[]) => {
					data.units[i].hashrateChart = points;
					if (++dataCount === reqDataCount) res.send(data);
				});
				this.database.getUnitChartTemp(body.start, body.end, body.rig, i).then((points: ChartPoint[]) => {
					data.units[i].tempChart = points;
					if (++dataCount === reqDataCount) res.send(data);
				});
			}
		});
	}

	private routeSetRigNicename(req: Request, res: Response, next: Next) {
		const body: { rig: string, nicename: string } = req.body;

		this.database.setRigNicename(body.rig, body.nicename).then(() => res.send(<Returnable> {code: 0}));
	}

	private routeGetSituations(req: Request, res: Response, next: Next){
		const body: { page?: number } = req.body;
		if(body.page === undefined) body.page = 0;

		const data = {
			code: 0,
			situations: <Situation[]> [],
			more: false
		};

		this.database.getSituations(body.page).then((dbRes: { situations: Situation[], more: boolean }) => {
			data.situations = dbRes.situations;
			data.more = dbRes.more;

			res.send(data);
		});
	}

	private setRigReporting(req: Request, res: Response, next: Next){
		const body: SituationReporting = req.body;
		this.database.setSetting("rig_reporting", JSON.stringify(body)).then(() => {
			this.rigServer.updateReporting();
			res.send(<Returnable> { code: 0 });
		});
	}

	private setUnitReporting(req: Request, res: Response, next: Next){
		const body: SituationReporting = req.body;
		this.database.setSetting("unit_reporting", JSON.stringify(body)).then(() => {
			this.rigServer.updateReporting();
			res.send(<Returnable> { code: 0 });
		});
	}

	private getReporting(req: Request, res: Response, next: Next){
		const defReporting: SituationReporting = { enabled: false };
			const reporting: SituationReporting[] = [];

		this.database.getSetting("rig_reporting", JSON.stringify(defReporting)).then((data: string) => {
			const rigReporting: SituationReporting = JSON.parse(data);
			rigReporting.type = 0;
			reporting.push(rigReporting);

			if(reporting.length === 2)
				res.send(<Returnable & { reporting: SituationReporting[] }> { code: 0, reporting: reporting });
		});

		this.database.getSetting("unit_reporting", JSON.stringify(defReporting)).then((data: string) => {
			const unitReporting: SituationReporting = JSON.parse(data);
			unitReporting.type = 1;
			reporting.push(unitReporting);

			if(reporting.length === 2)
				res.send(<Returnable & { reporting: SituationReporting[] }> { code: 0, reporting: reporting });
		});
	}

	private setEmail(req: Request, res: Response, next: Next){
		const body: { email: string } = req.body;

		this.database.setSetting("email", body.email).then(() => {
			res.send(<Returnable> { code: 0 });
		});
	}

	private getEmail(req: Request, res: Response, next: Next){
		this.database.getSetting("email", "").then((email: string) => {
			res.send(<Returnable & { email: string }> { code: 0, email: email });
		});
	}
}
