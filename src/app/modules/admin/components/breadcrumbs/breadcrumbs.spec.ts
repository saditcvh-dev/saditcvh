import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

import { Breadcrumbs } from './breadcrumbs';

describe('Breadcrumbs', () => {
  let component: Breadcrumbs;
  let fixture: ComponentFixture<Breadcrumbs>;
  
  // Mock del Router
  const mockRouter = {
    events: of({}),
    navigate: () => Promise.resolve(true)
  };
  
  // Mock del ActivatedRoute
  const mockActivatedRoute = {
    root: {
      firstChild: null
    }
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [Breadcrumbs],
      providers: [
        { provide: Router, useValue: mockRouter },
        { provide: ActivatedRoute, useValue: mockActivatedRoute }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(Breadcrumbs);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with empty breadcrumbs', () => {
    expect(component.breadcrumbs).toEqual([]);
  });

  it('should format label correctly', () => {
    // Acceder al método privado usando 'as any'
    const componentPrivate = component as any;
    expect(componentPrivate.formatLabel('dashboard')).toBe('Dashboard');
    expect(componentPrivate.formatLabel('usuarios-activos')).toBe('Usuarios activos');
    expect(componentPrivate.formatLabel('auditoria')).toBe('Auditoria');
  });

  it('should correctly identify last item', () => {
    // Configurar breadcrumbs de prueba
    component.breadcrumbs = [
      { label: 'Dashboard', url: '/admin/dashboard' },
      { label: 'Usuarios', url: '/admin/usuarios' },
      { label: 'Detalles', url: '/admin/usuarios/detalles' }
    ];
    
    expect(component.isLast(0)).toBe(false);
    expect(component.isLast(1)).toBe(false);
    expect(component.isLast(2)).toBe(true);
  });

  it('should not throw error on destroy without subscription', () => {
    // Probar que ngOnDestroy no lanza errores incluso sin suscripción
    expect(() => component.ngOnDestroy()).not.toThrow();
  });

  it('should handle empty breadcrumb array', () => {
    component.breadcrumbs = [];
    expect(component.isLast(0)).toBe(false); // Índice 0 en array vacío
  });
});