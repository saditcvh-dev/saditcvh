import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { AdminRoutingModule } from './admin-routing-module';
import { Admin } from './admin';
import { AuditoriaView } from './pages/auditoria/auditoria.view';
import { DashboardView } from './pages/dashboard/dashboard.view';
import { DigitalizacionView } from './pages/digitalizacion/digitalizacion.view';
import { ExpedientesView } from './pages/expedientes/expedientes.view';
import { ReportesView } from './pages/reportes/reportes.view';
import { RespaldosView } from './pages/respaldos/respaldos.view';
import { UsuariosView } from './pages/usuarios/usuarios.view';
import { Header } from './components/header/header';
import { Sidebar } from './components/sidebar/sidebar';
import { UserFormComponent } from './components/user-form/user-form';
import { PasswordToggleComponent } from './components/password-toggle/password-toggle';
import { Breadcrumbs } from './components/breadcrumbs/breadcrumbs';
import { KpiCardComponent } from './components/reportes/kpi-card/kpi-card';
import { ReportCard } from './components/reportes/report-card/report-card';
import { Explorer } from './pages/expedientes/explorer/explorer';
import { Node } from './pages/expedientes/explorer/node/node';
import { TreeNodeComponent } from './pages/expedientes/explorer/tree-node/tree-node';
import { CardsComponent } from './components/dashboard/cards/cards';
import { GraphicComponent } from './components/dashboard/graphic/graphic';
import { ExpRecentComponent } from './components/dashboard/exp-recent/exp-recent';
import { GraphicCircle } from './components/reportes/graphic-circle/graphic-circle';

@NgModule({
  declarations: [
    Admin,
    AuditoriaView,
    DashboardView,
    DigitalizacionView,
    ExpedientesView,
    ReportesView,
    RespaldosView,
    UsuariosView,
    Header,
    Sidebar,
    Breadcrumbs,
    KpiCardComponent,
    UserFormComponent,
    PasswordToggleComponent,
    Explorer,
    Node,
    TreeNodeComponent,
    CardsComponent,
    GraphicComponent,
    ExpRecentComponent,
    GraphicCircle,
    ReportCard,
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    AdminRoutingModule,
    FormsModule,
  ]
})
export class AdminModule { }