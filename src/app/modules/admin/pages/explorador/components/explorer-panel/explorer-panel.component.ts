import { Component, Input, Output, EventEmitter } from '@angular/core';
import { AutorizacionTreeNode } from '../../../../../../core/models/autorizacion-tree.model';
// import { AutorizacionTreeNode } from '../../../../core/models/autorizacion-tree.model';

@Component({
  selector: 'app-explorer-panel',standalone: false,
  templateUrl: './explorer-panel.component.html',
  styleUrls: ['./explorer-panel.component.css']
})
export class ExplorerPanelComponent {
  @Input() tree: AutorizacionTreeNode[] = [];
  @Input() selectedNode: AutorizacionTreeNode | null = null;
  
  @Output() nodeSelected = new EventEmitter<AutorizacionTreeNode>();
  @Output() nodeRightClick = new EventEmitter<{ mouseEvent: MouseEvent, node: AutorizacionTreeNode }>();

  onNodeSelected(node: AutorizacionTreeNode): void {
    // console.log("node")
    // console.log(node)
    this.nodeSelected.emit(node);
  }

onNodeRightClick(event: { mouseEvent: MouseEvent; node: AutorizacionTreeNode }): void {
  // console.log("onNodeRightClick")
  this.nodeRightClick.emit(event);
}

}