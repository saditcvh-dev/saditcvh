import { Component, OnInit } from '@angular/core';
import { Document } from '../services/document';

@Component({
  selector: 'app-metadata',
 standalone: false,
  templateUrl: './metadata.html',
  styleUrl: './metadata.css',
})
export class Metadata implements OnInit {


  document: any = null;
  constructor(private documentService: Document) {}

    ngOnInit(): void {
    this.documentService.selectedDocument$.subscribe(doc => {
      this.document = doc;
    });
  }

}
