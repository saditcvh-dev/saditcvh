import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

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
import { Explorer } from './pages/expedientes/explorer/explorer';
import { Node } from './pages/expedientes/explorer/node/node';
import { Metadata } from './pages/expedientes/metadata/metadata';
import { RouterModule } from '@angular/router';
import { Viewer } from './pages/expedientes/viewer/viewer';
import { Breadcrumbs } from './components/breadcrumbs/breadcrumbs';
import { TreeNodeComponent } from './pages/expedientes/explorer/tree-node/tree-node';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';


@NgModule({
  declarations: [
    Admin,
    Breadcrumbs,
    AuditoriaView,
    DashboardView,
    DigitalizacionView,
    ExpedientesView,
    ReportesView,
    RespaldosView,
    UsuariosView,
    Header,
    Sidebar,
    Explorer,
    Node,
    Metadata,
    Viewer,
    TreeNodeComponent
  ],
  imports: [
    CommonModule,
    AdminRoutingModule,
    RouterModule,
    HttpClientModule,
    FormsModule,
    ReactiveFormsModule,
  ]
})
export class AdminModule { }
