import { BrowserModule } from "@angular/platform-browser";
import { NgModule } from "@angular/core";


import { AppComponent } from "./app.component";
import { HttpClientModule } from "@angular/common/http";
import { AppRouterModule } from "./app-router.module";
import { SidebarComponent } from "./sidebar/sidebar.component";
import { OverviewComponent } from "./overview/overview.component";
import { BackendService } from "./backend.service";
import { ChartsModule } from "ng2-charts";
import { RigComponent } from './rig/rig.component';
import { DataStoreService } from "./dataStore.service";
import { FormsModule } from "@angular/forms";
import { SituationsComponent } from './situations/situations.component';


@NgModule({
	declarations: [
		AppComponent,
		SidebarComponent,
		OverviewComponent,
		RigComponent,
		SituationsComponent
	],
	imports: [
		BrowserModule,
		HttpClientModule,
		AppRouterModule,
		ChartsModule,
		FormsModule
	],
	providers: [ SidebarComponent, BackendService, DataStoreService ],
	bootstrap: [ AppComponent ]
})
export class AppModule {
	constructor(){
	}
}
