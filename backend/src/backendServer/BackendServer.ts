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
import {Problem} from '../types/interface.Problem';
import {ProblemReporting} from '../types/interface.ProblemReporting';
import {Settings} from '../types/interface.Settings';
import {RigAutoReboot} from '../types/interface.RigAutoReboot';
import moment = require('moment');
import {isNumber} from 'util';

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
		this.server.post('/get_hashrate', (req, res, next) => this.routeGetHashrate(req, res, next));
		this.server.post('/get_chart', (req, res, next) => this.routeGetGraph(req, res, next));

		this.server.post('/get_rig', (req, res, next) => this.routeGetRig(req, res, next));
		this.server.post('/get_rig_numbers', (req, res, next) => this.routeGetRigNumbers(req, res, next));
		this.server.post('/get_rig_charts', (req, res, next) => this.routeGetRigCharts(req, res, next));

		this.server.post('/set_rig_nicename', (req, res, next) => this.routeSetRigNicename(req, res, next));
		this.server.post('/set_rig_power', (req, res, next) => this.routeSetRigPower(req, res, next));
		this.server.post('/set_rig_autoreboot', (req, res, next) => this.routeSetRigAutoReboot(req, res, next));
		this.server.post('/get_rig_autoreboot', (req, res, next) => this.routeGetRigAutoReboot(req, res, next));

		this.server.post('/get_problems', (req, res, next) => this.routeGetProblems(req, res, next));

		this.server.post('/set_settings', (req, res, next) => this.routeSetSettings(req, res, next));
		this.server.post('/get_settings', (req, res, next) => this.routeGetSettings(req, res, next));

		this.server.post('/rig_restart', (req, res, next) => this.routeRigRestart(req, res, next));
		this.server.post('/rig_reboot', (req, res, next) => this.routeRigReboot(req, res, next));
		this.server.post('/rig_delete', (req, res, next) => this.routeRigDelete(req, res, next));

		this.server.post('/get_statistics', (req, res, next) => this.routeGetStatistics(req, res, next));
	}

	private routeGetRigs(req: Request, res: Response, next: Next) {
		this.database.getRigs().then((rigs: Rig[]) => {
			res.send(<RigsRet> {
				code: 0,
				rigs: rigs
			});
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
			let retRig: Rig = { name: null, hashrate: null, power: null };

			this.database.getRig(body.rig).then((rig: Rig) => {
				if(retRig.hashrate !== null){
					retRig.nicename = rig.nicename;
					retRig.power = rig.power;
					res.send(retRig);
				}else{
					retRig = rig;
				}
			});

			this.rigServer.getRigData(body.rig, (rig: Rig) => {
				if(retRig.name !== null){
					rig.nicename = retRig.nicename;
					rig.power = retRig.power;
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

	private routeGetProblems(req: Request, res: Response, next: Next){
		const body: { page?: number } = req.body;
		if(body.page === undefined) body.page = 0;

		const data = {
			code: 0,
			problems: <Problem[]> [],
			more: false
		};

		this.database.getProblems(body.page).then((dbRes: { problems: Problem[], more: boolean }) => {
			data.problems = dbRes.problems;
			data.more = dbRes.more;

			res.send(data);
		});
	}

	private routeGetSettings(req: Request, res: Response, next: Next){
		const defSettings: Settings = {
			notifEmail: "email@example.com",
			powerPrice: 0,
			reportInterval: 10,
			rigReporting: { enabled: false, time: 5 },
			unitReporting: { enabled: false, time: 5 }
		};

		this.database.getSettings(null, defSettings).then((settings: Settings) => {
			res.send(<Returnable & { settings: Settings }> { code: 0, settings: settings });
		});
	}

	private routeSetSettings(req: Request, res: Response, next: Next){
		const body: Settings = req.body;
		this.database.setSettings(body).then(() => {
			this.rigServer.updateReporting();
		});

		if(this.rigServer.collectionInterval !== body.reportInterval)
			this.rigServer.setCollection(body.reportInterval);

		res.send(<Returnable> { code: 0 });
	}

	private routeSetRigPower(req: Request, res: Response, next: Next){
		const body: { rig: string, power: number } = req.body;
		this.database.setRigPower(body.rig, body.power);
		res.send(<Returnable> { code: 0 });
	}

	private routeSetRigAutoReboot(req: Request, res: Response, next: Next){
		const body: { rig: string, autoReboot: RigAutoReboot } = req.body;
		this.database.setRigAutoReboot(body.rig, body.autoReboot);
		res.send(<Returnable> { code: 0 });
	}

	private routeGetRigAutoReboot(req: Request, res: Response, next: Next){
		const body: { rig: string } = req.body;
		this.database.getRigAutoReboot(body.rig).then((autoReboot: RigAutoReboot) => {
			res.send(<Returnable & { autoReboot: RigAutoReboot }> { code: 0, autoReboot: autoReboot });
		});
	}

	private routeRigReboot(req: Request, res: Response, next: Next){
		const body: { rig: string } = req.body;
		this.rigServer.rigReboot(body.rig);
		res.send(<Returnable> { code: 0 });
	}

	private routeRigRestart(req: Request, res: Response, next: Next){
		const body: { rig: string } = req.body;
		this.rigServer.rigRestart(body.rig);
		res.send(<Returnable> { code: 0 });
	}

	private routeRigDelete(req: Request, res: Response, next: Next){
		const body: { rig: string } = req.body;
		this.rigServer.rigDisconnect(body.rig);
		this.database.rigDelete(body.rig);
		res.send(<Returnable> { code: 0 });
	}

	private routeGetStatistics(req: Request, res: Response, next: Next){
		const body = <ChartParams> req.body;

		const stats: {
			rig: { rig_name: string, count: number }[],
			unit: { rig_name: string, unit_index: number, count: number }[],
			earnings: number
		} = {
			rig: null,
			unit: null,
			earnings: null
		};

		this.database.getRigFailures(body.start, body.end).then((s) => {
			stats.rig = s;

			if(stats.unit != null && stats.earnings != null) res.send({ code: 0, stats: stats });
		});

		this.database.getUnitFailures(body.start, body.end).then((s) => {
			stats.unit = s;

			if(stats.rig != null && stats.earnings != null) res.send({ code: 0, stats: stats });
		});

		let koef = 0.02897739785300082; // earnings per day per mh/s
		koef /= (24*60); // per minute

		this.database.getChartHashrate(body.start, body.end).then((points) => {
			let start: { value: number, time: string } = null;
			let earnings = 0;

			points.forEach((p) => {
				if(start != null){
					const mins = moment(p.time).diff(moment(start.time), "minutes", true);
					const epm = (start.value + p.value) / mins / 1000;

					const ear = epm*koef;
					if(!isNaN(ear))	earnings += epm*koef;
				}

				start = p;
			});

			stats.earnings = earnings;
			console.log(earnings);

			if(stats.rig != null && stats.unit != null) res.send({ code: 0, stats: stats });
		});
	}
}
