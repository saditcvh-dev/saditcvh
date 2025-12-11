import { Component, OnInit } from '@angular/core';
import { Document } from '../services/document';

@Component({
  selector: 'app-explorer',
  standalone: false,
  templateUrl: './explorer.html',
  styleUrl: './explorer.css',
})
export class Explorer implements OnInit {
 tree: any = null;

 constructor(private documentService: Document) {}

  ngOnInit(): void {
    this.documentService.getTree().subscribe(t => this.tree = t);
  }

}
