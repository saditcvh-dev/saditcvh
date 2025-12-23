import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReportCardComponent } from './report-card';
import { By } from '@angular/platform-browser';
import { CommonModule } from '@angular/common'; 

describe('ReportCardComponent', () => {
  let component: ReportCardComponent;
  let fixture: ComponentFixture<ReportCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ReportCardComponent],
      imports: [CommonModule] // ← Importar CommonModule para *ngIf, *ngFor, etc.
    }).compileComponents();

    fixture = TestBed.createComponent(ReportCardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Normal Report Card', () => {
    beforeEach(() => {
      component.title = 'Productividad del equipo';
      component.description = 'Métricas de rendimiento';
      component.icon = 'fas fa-chart-line';
      component.color = 'blue';
      component.frequency = 'Mensual';
      component.lastGenerated = '15/12/2025';
      component.isCustom = false;
      fixture.detectChanges();
    });

    it('should display correct title', () => {
      const titleElement = fixture.debugElement.query(By.css('h4')).nativeElement;
      expect(titleElement.textContent).toContain('Productividad del equipo');
    });

    it('should display correct description', () => {
      const descElement = fixture.debugElement.query(By.css('p.text-gray-500')).nativeElement;
      expect(descElement.textContent).toContain('Métricas de rendimiento');
    });

    it('should display frequency badge', () => {
      const badgeElement = fixture.debugElement.query(By.css('span.text-xs')).nativeElement;
      expect(badgeElement.textContent).toContain('Mensual');
    });

    it('should display last generated date', () => {
      const dateElement = fixture.debugElement.query(By.css('span.text-gray-400')).nativeElement;
      expect(dateElement.textContent).toContain('15/12/2025');
    });

    it('should handle generate click without errors', () => {
      const cardElement = fixture.debugElement.query(By.css('div[role="button"]'));

      expect(() => {
        cardElement.triggerEventHandler('click', null);
      }).not.toThrow();
    });

    it('should have blue color classes when color is blue', () => {
      const iconContainer = fixture.debugElement.query(By.css('.w-10.h-10'));
      expect(iconContainer.classes['bg-blue-100']).toBe(true);
    });
  });

  describe('Custom Report Card', () => {
    beforeEach(() => {
      component.title = 'Reporte personalizado';
      component.description = 'Configura tus propios parámetros';
      component.icon = 'fas fa-sliders-h';
      component.color = 'blue';
      component.isCustom = true;
      fixture.detectChanges();
    });

    it('should display custom card layout', () => {
      const cardElement = fixture.debugElement.query(By.css('div[role="button"]'));
      expect(cardElement.classes['border-dashed']).toBe(true);
      expect(cardElement.classes['text-center']).toBe(true);
    });

    it('should display config button instead of generate', () => {
      const buttonElement = fixture.debugElement.query(By.css('button')).nativeElement;
      expect(buttonElement.textContent).toContain('Configurar');
    });

    it('should handle configure click without errors', () => {
      const cardElement = fixture.debugElement.query(By.css('div[role="button"]'));

      expect(() => {
        cardElement.triggerEventHandler('click', null);
      }).not.toThrow();
    });
  });

  describe('Color Variations', () => {
    const testCases = [
      { color: 'green', expectedClass: 'bg-green-100' },
      { color: 'purple', expectedClass: 'bg-purple-100' },
      { color: 'orange', expectedClass: 'bg-orange-100' },
      { color: 'red', expectedClass: 'bg-red-100' }
    ];

    testCases.forEach(testCase => {
      it(`should apply ${testCase.color} color classes`, () => {
        component.color = testCase.color as any;
        component.isCustom = false;
        fixture.detectChanges();

        const iconContainer = fixture.debugElement.query(By.css('.w-10.h-10'));
        expect(iconContainer.classes[testCase.expectedClass]).toBe(true);
      });
    });
  });

  describe('Keyboard Accessibility', () => {
    it('should handle Enter key without errors', () => {
      const cardElement = fixture.debugElement.query(By.css('div[role="button"]'));
      const event = new KeyboardEvent('keydown', { key: 'Enter' });

      expect(() => {
        cardElement.triggerEventHandler('keydown.enter', event);
      }).not.toThrow();
    });
  });
});