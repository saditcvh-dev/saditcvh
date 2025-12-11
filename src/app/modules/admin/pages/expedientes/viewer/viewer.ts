import { Component, OnInit } from '@angular/core';
import { Document } from '../services/document';

@Component({
  selector: 'app-viewer',
  standalone: false,
  templateUrl: './viewer.html',
  styleUrl: './viewer.css',
})
export class Viewer implements OnInit {
    document: any = null;
    constructor(private documentService: Document) {}

    ngOnInit(): void {
      this.documentService.selectedDocument$.subscribe(doc => {
        this.document = doc;
      });
    }
}
