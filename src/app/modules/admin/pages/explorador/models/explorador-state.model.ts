import { AutorizacionTreeNode } from "../../../../../core/models/autorizacion-tree.model";

export interface Breadcrumb {
  name: string;
  node: AutorizacionTreeNode;
}

export interface ToastState {
  visible: boolean;
  message: string;
  type: 'success' | 'error';
}

export interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  node: AutorizacionTreeNode | null;
}

export interface ModalState {
  visible: boolean;
  type: string | null;
  title: string;
  message?: string;
  data?: any;
}

export interface UploadModalState {
  visible: boolean;
  mode: 'version' | 'new' | null;
  title: string;
}