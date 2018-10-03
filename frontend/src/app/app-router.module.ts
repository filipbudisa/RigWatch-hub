import { NgModule } from "@angular/core";
import { RouterModule, Routes } from "@angular/router";
import { OverviewComponent } from "./overview/overview.component";
import { RigComponent } from "./rig/rig.component";
import { ProblemsComponent } from "./problems/problems.component";
import { SettingsComponent } from "./settings/settings.component";
import { StatisticsComponent } from "./statistics/statistics.component";

const appRoutes: Routes = [
	{
		path: "problems",
		component: ProblemsComponent
	},
	{
		path: "settings",
		component: SettingsComponent
	},
	{
		path: "statistics",
		component: StatisticsComponent
	},
	{
		path: "rig/:rig",
		component: RigComponent
	},
	{
		path: "",
		component: OverviewComponent
	}
];

@NgModule({
	imports: [
		RouterModule.forRoot(appRoutes)
	],
	exports: [ RouterModule ],
	declarations: []
})
export class AppRouterModule {
}