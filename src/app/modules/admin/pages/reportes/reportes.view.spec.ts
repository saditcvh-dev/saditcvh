import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReportesView } from './reportes.view';
import { KpiCardComponent } from '../../components/reportes/kpi-card/kpi-card';
import { ReportCardComponent } from '../../components/reportes/report-card/report-card';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { By } from '@angular/platform-browser';

describe('ReportesView', () => {
  let component: ReportesView;
  let fixture: ComponentFixture<ReportesView>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [
        ReportesView,
        KpiCardComponent,
        ReportCardComponent
      ],
      imports: [HttpClientTestingModule]
    }).compileComponents();

    fixture = TestBed.createComponent(ReportesView);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize KPI configurations', () => {
    expect(component.expedientesKpi.title).toBe('Expedientes procesados');
    expect(component.expedientesKpi.value).toBe('20,400');
    expect(component.expedientesKpi.icon).toBe('fas fa-archive');
  });

  it('should have all KPI configurations', () => {
    expect(component.paginasKpi).toBeDefined();
    expect(component.ocrKpi).toBeDefined();
    expect(component.velocidadKpi).toBeDefined();
  });

  it('should handle KPI card click without errors', () => {
    expect(() => component.onKpiClick('Expedientes procesados')).not.toThrow();
  });

  it('should have reportes detallados array', () => {
    expect(component.reportesDetallados.length).toBe(6);
  });

  it('should include custom report', () => {
    const custom = component.reportesDetallados.find(r => r.isCustom);
    expect(custom).toBeDefined();
    expect(custom?.title).toBe('Reporte personalizado');
  });

  it('should setup clickable cards', () => {
    component.setupClickableCards();
    expect(component.expedientesKpi.onClick).toBeDefined();
    expect(component.paginasKpi.onClick).toBeDefined();
  });

  // =============================
  // HTTP TESTS (SIN JASMINE)
  // =============================
  it('should POST when generating report', () => {
    const reporte = component.reportesDetallados[3]; // Uso del sistema

    component.onGenerateReport(reporte);

    const req = httpMock.expectOne('http://localhost:4000/api/reports/generar-reporte');
    expect(req.request.method).toBe('POST');

    expect(req.request.body.reportType).toBe('Uso del sistema');
    expect(typeof req.request.body.timestamp).toBe('string');

    req.flush(new Blob(['PDF'], { type: 'application/pdf' }));
  });

  it('should handle backend error gracefully', () => {
    component.onGenerateReport(component.reportesDetallados[0]);

    const req = httpMock.expectOne('http://localhost:4000/api/reports/generar-reporte');
    req.flush('Error', { status: 500, statusText: 'Server Error' });

    expect(component.isLoading).toBe(false);
  });

  it('should handle network error gracefully', () => {
    component.onGenerateReport(component.reportesDetallados[0]);

    const req = httpMock.expectOne('http://localhost:4000/api/reports/generar-reporte');
    req.error(new ErrorEvent('Network error'));

    expect(component.isLoading).toBe(false);
  });

  // =============================
  // UI TESTS
  // =============================
  it('should render report cards', () => {
    const cards = fixture.debugElement.queryAll(By.css('app-report-card'));
    expect(cards.length).toBe(component.reportesDetallados.length);
  });

  it('should update generation date', () => {
    const before = component.reportesDetallados[0].lastGenerated;
    (component as any).actualizarFechaGeneracion('Productividad del equipo');
    expect(component.reportesDetallados[0].lastGenerated).not.toBe(before);
  });

  it('should open custom report modal without errors', () => {
    expect(() => component.openCustomReportModal()).not.toThrow();
  });

  it('should test backend endpoint', () => {
    component.probarBackendPDF();

    const req = httpMock.expectOne('http://localhost:4000/api/reports/test');
    expect(req.request.method).toBe('GET');

    req.flush({ status: 'ok' });
  });

  it('should prevent multiple simultaneous requests', () => {
    const reporte = component.reportesDetallados[0];

    component.onGenerateReport(reporte);
    expect(component.isLoading).toBe(true);

    component.onGenerateReport(reporte);
    expect(component.isLoading).toBe(true);
  });
});
