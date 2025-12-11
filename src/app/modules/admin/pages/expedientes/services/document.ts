import { Injectable } from '@angular/core';
import { BehaviorSubject, of } from 'rxjs';
import treeData from '../../../../../../../public/mock/tree.json';

@Injectable({
  providedIn: 'root',
})
export class Document {
  private tree = treeData.tree;
  selectedDocument$ = new BehaviorSubject<any>(null);

  constructor() {}

  getTree() {
    return of (this.tree);
  }

  setSelectedDocument(doc: any) {
    this.selectedDocument$.next(doc);
  }

   getDocumentById(id: string) {
    const search = (node: any): any => {
      if (node.type === 'documento' && node.id === id) return node;
      if (node.children) {
        for (const c of node.children) {
          const r = search(c);
          if (r) return r;
        }
      }
      return null;
    };
    return of(search(this.tree));
  }

  search(text: string) {
    const results: any[] = [];
    const lower = text.toLowerCase();

    const scan = (node: any) => {
      if (node.type === 'documento') {
        const all = (node.ocr_text || '') + JSON.stringify(node.metadata || {});
        if (all.toLowerCase().includes(lower)) results.push(node);
      }
      if (node.children) node.children.forEach(scan);
    };

    scan(this.tree);
    return of(results);
  }

}
