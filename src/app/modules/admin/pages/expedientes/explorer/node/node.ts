import { Component, Input } from '@angular/core';
import { Document } from '../../services/document';

@Component({
  selector: 'app-node',
  standalone: false,
  templateUrl: './node.html',
  styleUrl: './node.css',
})
export class Node {

    @Input() node: any;
    expanded = false;

    constructor(private documentService: Document) {}

    toggle() {
      this.expanded = !this.expanded;
    }

     selectDocument(doc: any) {
    this.documentService.setSelectedDocument(doc);
  }

}
