import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PdfViewerDocument } from './pdf-viewer';

describe('PdfViewerDocument', () => {
  let component: PdfViewerDocument;
  let fixture: ComponentFixture<PdfViewerDocument>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PdfViewerDocument]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PdfViewerDocument);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
