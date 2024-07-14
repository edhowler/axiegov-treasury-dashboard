import { Routes } from '@angular/router';
import { DashboardComponent } from './dashboard/dashboard.component';
import { AnalysisComponent } from './analysis/analysis.component';

export const routes: Routes = [
    { path: '', component: DashboardComponent },
    { path: 'analysis', component: AnalysisComponent },
];