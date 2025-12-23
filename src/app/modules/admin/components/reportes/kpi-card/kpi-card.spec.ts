import { ComponentFixture, TestBed } from '@angular/core/testing';
import { KpiCardComponent, KpiCardConfig } from './kpi-card';

describe('KpiCardComponent', () => {
  let component: KpiCardComponent;
  let fixture: ComponentFixture<KpiCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [KpiCardComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(KpiCardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display title and value', () => {
    component.config = {
      title: 'Expedientes procesados',
      value: '20,400'
    };
    fixture.detectChanges();

    const compiled = fixture.nativeElement;
    expect(compiled.textContent).toContain('Expedientes procesados');
    expect(compiled.textContent).toContain('20,400');
  });

  it('should display icon with custom colors', () => {
    component.config = {
      title: 'Test',
      value: '100',
      icon: 'fas fa-archive',
      iconBgColor: 'bg-blue-100',
      iconTextColor: 'text-blue-600'
    };
    fixture.detectChanges();

    const iconContainer = fixture.nativeElement.querySelector('.rounded-full');
    const icon = fixture.nativeElement.querySelector('i');
    
    expect(iconContainer.classList).toContain('bg-blue-100');
    expect(icon.classList).toContain('fa-archive');
    expect(icon.classList).toContain('text-blue-600');
  });

  it('should show upward trend correctly', () => {
    component.config = {
      title: 'Test',
      value: '100',
      trend: 12.5,
      trendUp: true,
      trendLabel: 'vs anterior'
    };
    fixture.detectChanges();

    const compiled = fixture.nativeElement;
    expect(compiled.textContent).toContain('12.5%');
    expect(compiled.textContent).toContain('vs anterior');
    
    const trendIcon = fixture.nativeElement.querySelector('.fa-arrow-up');
    expect(trendIcon).toBeTruthy();
  });

  it('should show downward trend correctly', () => {
    component.config = {
      title: 'Test',
      value: '100',
      trend: 2.1,
      trendUp: false
    };
    fixture.detectChanges();

    const trendIcon = fixture.nativeElement.querySelector('.fa-arrow-down');
    expect(trendIcon).toBeTruthy();
  });

  it('should hide trend when showTrend is false', () => {
    component.config = {
      title: 'Test',
      value: '100',
      trend: 10,
      showTrend: false
    };
    fixture.detectChanges();

    const trendText = fixture.nativeElement.textContent;
    expect(trendText).not.toContain('10%');
  });

  it('should show loading state', () => {
    component.config = {
      title: 'Test',
      value: '100',
      loading: true
    };
    fixture.detectChanges();

    const loadingElement = fixture.nativeElement.querySelector('.animate-pulse');
    expect(loadingElement).toBeTruthy();
  });

  it('should handle click when clickable', () => {
    let clicked = false;
    component.config = {
      title: 'Test',
      value: '100',
      onClick: () => { clicked = true; }
    };
    component.clickable = true;
    fixture.detectChanges();

    const card = fixture.nativeElement.querySelector('.cursor-pointer');
    card.click();
    
    expect(clicked).toBe(true);
  });

  it('should not handle click when not clickable', () => {
    let clicked = false;
    component.config = {
      title: 'Test',
      value: '100',
      onClick: () => { clicked = true; }
    };
    component.clickable = false;
    fixture.detectChanges();

    const card = fixture.nativeElement.querySelector('div');
    card.click();
    
    expect(clicked).toBe(false);
  });

  it('should use individual inputs correctly', () => {
    component.title = 'Custom Title';
    component.value = '999';
    component.icon = 'fas fa-custom';
    component.iconBgColor = 'bg-red-100';
    component.iconTextColor = 'text-red-600';
    component.trend = 15;
    component.trendUp = true;
    component.trendLabel = 'custom label';
    component.showTrend = true;
    component.loading = false;
    
    fixture.detectChanges();

    expect(component.config.title).toBe('Custom Title');
    expect(component.config.value).toBe('999');
    expect(component.config.icon).toBe('fas fa-custom');
    expect(component.config.iconBgColor).toBe('bg-red-100');
    expect(component.config.iconTextColor).toBe('text-red-600');
    expect(component.config.trend).toBe(15);
    expect(component.config.trendUp).toBe(true);
    expect(component.config.trendLabel).toBe('custom label');
    expect(component.config.showTrend).toBe(true);
    expect(component.config.loading).toBe(false);
  });

  it('should return correct trend colors', () => {
    component.config.trend = 10;
    component.config.trendUp = true;
    expect(component.trendColor).toBe('text-green-600');
    
    component.config.trendUp = false;
    expect(component.trendColor).toBe('text-red-600');
    
    component.config.trend = 0;
    expect(component.trendColor).toBe('text-gray-500');
  });

  it('should return correct trend icons', () => {
    component.config.trend = 10;
    component.config.trendUp = true;
    expect(component.trendIcon).toBe('fas fa-arrow-up');
    
    component.config.trendUp = false;
    expect(component.trendIcon).toBe('fas fa-arrow-down');
    
    component.config.trend = 0;
    expect(component.trendIcon).toBe('fas fa-minus');
  });
});