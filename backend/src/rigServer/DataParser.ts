import {Rig} from '../types/interface.Rig';
import {DataClaymore} from '../types/data/interface.DataClaymore';
import {Unit} from '../types/interface.Unit';
import {UnitMake} from '../types/enum.UnitMake';
import {UnitType} from '../types/enum.UnitType';

export class DataParser {
	public static parseData(data: string): Rig {
		return this.parseClaymore(data);
	}

	private static parseClaymore(data: string): Rig {
		let i = data.indexOf("{");
		const cData: DataClaymore = <DataClaymore> JSON.parse(data.substring(i));
		const rigData: string[] = cData.result[2].split(";");

		const rig: Rig = {
			name: data.substr(0, i),
			units: [],

			runtime: parseFloat(cData.result[1]),
			hashrate: parseFloat(rigData[0]),
			shares: rigData[1] ? parseFloat(rigData[1]) : undefined
		};

		const unitRates = cData.result[3].split(";");
		const unitTemps = cData.result[6].split(";");

		for(i = 0; i < unitRates.length; i++){
			const unit: Unit = {
				make: UnitMake.AMD,
				model: "RX580",
				type: UnitType.GPU,

				hashrate: parseFloat(unitRates[i]),
				temp: parseFloat(unitTemps[i*2])
			};

			rig.units.push(unit);
		}

		return rig;
	}
}
