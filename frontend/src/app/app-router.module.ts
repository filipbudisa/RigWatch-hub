import { NgModule } from "@angular/core";
import { RouterModule, Routes } from "@angular/router";
import { OverviewComponent } from "./overview/overview.component";
import { RigComponent } from "./rig/rig.component";
import { SituationsComponent } from "./situations/situations.component";

const appRoutes: Routes = [
	{
		path: "situations",
		component: SituationsComponent
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