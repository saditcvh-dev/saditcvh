import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { HttpClientModule } from '@angular/common/http';

import { AdminRoutingModule } from './admin-routing-module';
import { Admin } from './admin';

/* Views */
import { AuditoriaView } from './pages/auditoria/auditoria.view';
import { DashboardView } from './pages/dashboard/dashboard.view';
import { DigitalizacionView } from './pages/digitalizacion/digitalizacion.view';
import { ExpedientesView } from './pages/expedientes/expedientes.view';
import { ReportesView } from './pages/reportes/reportes.view';
import { RespaldosView } from './pages/respaldos/respaldos.view';
import { UsuariosView } from './pages/usuarios/usuarios.view';

/* Layout */
import { Header } from './components/header/header';
import { Sidebar } from './components/sidebar/sidebar';
import { Breadcrumbs } from './components/breadcrumbs/breadcrumbs';

/* Expedientes */
import { Explorer } from './pages/expedientes/explorer/explorer';
import { Node } from './pages/expedientes/explorer/node/node';
import { TreeNodeComponent } from './pages/expedientes/explorer/tree-node/tree-node';
import { Metadata } from './pages/expedientes/metadata/metadata';
import { Viewer } from './pages/expedientes/viewer/viewer';

/* Reportes */
import { KpiCardComponent } from './components/reportes/kpi-card/kpi-card';
import { ReportCardComponent } from './components/reportes/report-card/report-card';

/* Usuarios */
import { UserFormComponent } from './components/user-form/user-form';
import { PasswordToggleComponent } from './components/password-toggle/password-toggle';

@NgModule({
  declarations: [
    Admin,

    /* Views */
    AuditoriaView,
    DashboardView,
    DigitalizacionView,
    ExpedientesView,
    ReportesView,
    RespaldosView,
    UsuariosView,

    /* Layout */
    Header,
    Sidebar,
    Breadcrumbs,

    /* Expedientes */
    Explorer,
    Node,
    TreeNodeComponent,
    Metadata,
    Viewer,

    /* Reportes */
    KpiCardComponent,

    /* Usuarios */
    UserFormComponent,
    PasswordToggleComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    HttpClientModule,
    AdminRoutingModule,

    /* Standalone */
    ReportCardComponent
  ]
})
export class AdminModule {}
