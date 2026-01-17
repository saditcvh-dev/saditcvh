import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PdfViewerView } from './pdf-viewer.view';

describe('PdfViewerView', () => {
  let component: PdfViewerView;
  let fixture: ComponentFixture<PdfViewerView>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PdfViewerView]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PdfViewerView);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
