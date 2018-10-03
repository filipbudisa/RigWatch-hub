import { BrowserModule } from "@angular/platform-browser";
import { Injector, NgModule } from "@angular/core";


import { AppComponent } from "./app.component";
import { HttpClientModule } from "@angular/common/http";
import { AppRouterModule } from "./app-router.module";
import { SidebarComponent } from "./sidebar/sidebar.component";
import { OverviewComponent } from "./overview/overview.component";
import { BackendService } from "./backend.service";
import { ChartsModule } from "ng2-charts";
import { RigComponent } from "./rig/rig.component";
import { DataStoreService } from "./dataStore.service";
import { FormsModule } from "@angular/forms";
import { ProblemsComponent } from "./problems/problems.component";
import { EthereumService } from "./ethereum.service";
import { ChartComponent } from "./chart/chart.component";
import { createCustomElement } from "@angular/elements";
import { SettingsComponent } from './settings/settings.component';
import { StatisticsComponent } from './statistics/statistics.component';


@NgModule({
	declarations: [
		AppComponent,
		SidebarComponent,
		OverviewComponent,
		RigComponent,
		ProblemsComponent,
		ChartComponent,
		SettingsComponent,
		StatisticsComponent
	],
	imports: [
		BrowserModule,
		HttpClientModule,
		AppRouterModule,
		ChartsModule,
		FormsModule
	],
	providers: [ SidebarComponent, BackendService, DataStoreService, EthereumService ],
	bootstrap: [ AppComponent ],
	entryComponents: [ ChartComponent ]
})
export class AppModule {
	constructor(private injector: Injector){
	}

	ngDoBootstrap(){
		const chart = createCustomElement(ChartComponent, { injector: this.injector });
		customElements.define("rw-chart", chart);
	}
}
