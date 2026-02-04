import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { AdminRoutingModule } from './admin-routing-module';
import { Admin } from './admin';
import { AuditoriaView } from './pages/auditoria/auditoria.view';
import { DashboardView } from './pages/dashboard/dashboard.view';
import { DigitalizacionView } from './pages/digitalizacion/digitalizacion.view';
import { ReportesView } from './pages/reportes/reportes.view';
import { RespaldosView } from './pages/respaldos/respaldos.view';
import { UsuariosView } from './pages/usuarios/usuarios.view';
import { Header } from './components/header/header';
import { Sidebar } from './components/sidebar/sidebar';
import { UserFormComponent } from './components/user-form/user-form';
import { PasswordToggleComponent } from './components/password-toggle/password-toggle';
import { Breadcrumbs } from './components/breadcrumbs/breadcrumbs';
import { ReportCard } from './components/reportes/report-card/report-card';
import { CardsComponent } from './components/dashboard/cards/cards';
import { GraphicComponent } from './components/dashboard/graphic/graphic';
import { ExpRecentComponent } from './components/dashboard/exp-recent/exp-recent';
import { GraphicCircle } from './components/reportes/graphic-circle/graphic-circle';
import { GraphicModalidadBarsComponent } from './components/reportes/graphic-modalidad/graphic-modalidad';
import { GraphicMunicipioMapComponent } from './components/reportes/graphic-municipio/graphic-municipio';
import { PermissionMatrixComponent } from './components/permission-matrix/permission-matrix';
import { ActionBadgeComponent } from './components/action-badge/action-badge';
import { LogDetailModalComponent } from './components/log-detail-modal/log-detail-modal';
import { ExplorerPanelComponent } from './pages/explorador/components/explorer-panel/explorer-panel.component';
import { ViewerPanelComponent } from './pages/explorador/components/viewer-panel/viewer-panel.component';
import { ToastComponent } from './components/toast/toast.component';
import { TabsNavigationComponent } from './pages/explorador/components/tabs/tabs-navigation/tabs-navigation.component';
import { SecurityTabComponent } from './pages/explorador/components/tabs/security-tab/security-tab.component';
import { PreviewTabComponent } from './pages/explorador/components/tabs/preview-tab/preview-tab.component';
import { MetadataTabComponent } from './pages/explorador/components/tabs/metadata-tab/metadata-tab.component';
import { UploadModalComponent } from './pages/explorador/components/modals/upload-modal/upload-modal.component';
import { CreateAutorizacionModalComponent } from './pages/explorador/components/modals/create-autorizacion-modal/create-autorizacion-modal.component';
import { ContextMenuComponent } from './pages/explorador/components/context-menu/context-menu.component';
import { HistoryTabComponent } from './pages/explorador/components/tabs/history-tab/history-tab.component';
import { TreeNodeComponent } from './pages/explorador/components/tree-node/tree-node';
import { ModalContainerComponent } from './pages/explorador/components/modals/modal-container/modal-container.component';
import { FechaLocalPipe } from '../../core/pipes/fecha-local/fecha-local.pipe';
import { ExploradorView } from './pages/explorador/explorador.view';
import { PdfViewerView } from './components/pdf-viewer/pdf-viewer.view';
// import { NgxSpinnerModule } from 'ngx-spinner';
import { ExploradorStateService } from './pages/explorador/services/explorador-state.service';
import { PdfLocalSearchService } from './pages/digitalizacion/services/pdf-local-search.service';
import { UploadSectionComponent } from './pages/digitalizacion/upload-section/upload-section';
import { AnotacionesService } from '../../core/services/anotaciones.service';
import { Comentarios } from './pages/explorador/components/comentarios/comentarios';
// import { UploadSectionComponent } from './pages/digitalizacion/upload-section/upload-section';

@NgModule({
  declarations: [
    Admin,
    AuditoriaView,
    DashboardView,
    DigitalizacionView,
    PdfViewerView,
    ReportesView,
    RespaldosView,
    UsuariosView,
    Header,
    Sidebar,
    Breadcrumbs,
    UserFormComponent,
    Comentarios,
    PasswordToggleComponent,
    TreeNodeComponent,
    CardsComponent,
    GraphicComponent,
    GraphicModalidadBarsComponent,
    GraphicMunicipioMapComponent,
    ExpRecentComponent,
    GraphicCircle,
    ReportCard,
    UserFormComponent,
    PasswordToggleComponent,
    PermissionMatrixComponent,
    LogDetailModalComponent,
    ActionBadgeComponent,ExploradorView,ExplorerPanelComponent,
    ViewerPanelComponent, ToastComponent
    , TabsNavigationComponent, SecurityTabComponent, PreviewTabComponent, MetadataTabComponent, UploadModalComponent, CreateAutorizacionModalComponent, ModalContainerComponent
    , ContextMenuComponent,HistoryTabComponent,TreeNodeComponent, UploadSectionComponent,
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    AdminRoutingModule,
    FormsModule,FechaLocalPipe
  ],  providers: [AnotacionesService
    ,ExploradorStateService,PdfLocalSearchService]
  
})
export class AdminModule { }
