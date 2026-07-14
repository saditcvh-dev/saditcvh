import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { Admin } from './admin';
import { DashboardView } from './pages/dashboard/dashboard.view';
import { AuditoriaView } from './pages/auditoria/auditoria.view';
import { DigitalizacionView } from './pages/digitalizacion/digitalizacion.view';
import { ReportesView } from './pages/reportes/reportes.view';
import { RespaldosView } from './pages/respaldos/respaldos.view';
import { UsuariosView } from './pages/usuarios/usuarios.view';
import { PermissionMatrixComponent } from './components/permission-matrix/permission-matrix';
import { roleGuard } from '../../core/guards/role.guard';
import { pendingUploadGuard } from '../../core/guards/pending-upload.guard';
import { ExploradorView } from './pages/explorador/explorador.view';
import { PdfViewerView } from './components/pdf-viewer/pdf-viewer.view';

const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  {
    path: '',
    component: Admin,
    children: [
      {
        path: 'dashboard',
        component: DashboardView,
        data: {
          title: 'dashboard',
          breadcrumb: [{ label: 'dashboard', path: '/admin/dashboard' }],
        },
      },
      {
        path: 'digitalizacion',
        component: DigitalizacionView,
        canActivate: [roleGuard],
        canDeactivate: [pendingUploadGuard],
        data: {
          deniedRole: 'consulta',
          title: 'digitalizacion',
          breadcrumb: [{ label: 'digitalizacion', path: '/admin/digitalizacion' }],
        },
      },
        {
        path: 'PdfView',
        component: PdfViewerView,
        // canActivate: [roleGuard],
      },
      // {
      //   path: 'expedientes',
      //   component: ExploradorView,
      //   data: {
      //     title: 'expedientes',
      //     breadcrumb: [{ label: 'expedientes', path: '/admin/expedientes' }],
      //   },
      // },
      {
        path: 'explorador',
        component: ExploradorView,
        data: {
          title: 'explorador',
          breadcrumb: [
            {
              label: 'explorador',
              path: '/admin/explorador',
            },
          ],
        },
      },

      {
        path: 'reportes',
        component: ReportesView,
        canActivate: [roleGuard],
        data: {
          deniedRole: 'consulta',
          title: 'reportes',
          breadcrumb: [{ label: 'reportes', path: '/admin/reportes' }],
        },
      },
      {
        path: 'respaldos',
        component: RespaldosView,
        canActivate: [roleGuard],
        data: {
          role: 'administrador',
          title: 'respaldos',
          breadcrumb: [{ label: 'respaldos', path: '/admin/respaldos' }],
        },
      },
      {
        path: 'busqueda-global',
        loadComponent: () => import('./pages/busqueda-global/busqueda-global.view').then(m => m.BusquedaGlobalView),
        data: {
          title: 'búsqueda global',
          breadcrumb: [{ label: 'búsqueda global', path: '/admin/busqueda-global' }],
        },
      },
      // --- RUTAS PROTEGIDAS PARA ADMINISTRADORES ---
      {
        path: 'usuarios',
        component: UsuariosView,
        canActivate: [roleGuard],
        data: {
          role: 'administrador',
          title: 'usuarios',
          breadcrumb: [{ label: 'usuarios', path: '/admin/usuarios' }],
        },
      },
      {
        path: 'auditoria',
        component: AuditoriaView,
        canActivate: [roleGuard],
        data: {
          role: 'administrador',
          title: 'auditoria',
          breadcrumb: [{ label: 'auditoria', path: '/admin/auditoria' }],
        },
      },
      {
        path: 'permisos',
        component: PermissionMatrixComponent,
        canActivate: [roleGuard],
        data: {
          role: 'administrador',
          title: 'permisos',
          breadcrumb: [{ label: 'permisos', path: '/admin/permisos' }],
        },
      },
      {
        path: '**',
        redirectTo: 'dashboard',
      },
    
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AdminRoutingModule { }
