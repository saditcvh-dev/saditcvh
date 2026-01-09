import { AutorizacionTreeNode } from "./autorizacion-tree.model";

export interface Breadcrumb {
  name: string;
  node: AutorizacionTreeNode | null;
}

export interface ModalState {
 visible: boolean;
  type: 'delete' | 'create_autorizacion' | 'create_documento' | null;
  title: string;
  message?: string;
  inputValue?: string;
  data?: any;
}

export interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  node: any | null;
}

export interface ToastState {
  visible: boolean;
  message: string;
  type: 'success' | 'error';
}

export interface SecurityItem {
  actor: string;
  type: string;
  read: boolean;
  write: boolean;
  delete: boolean;
  security: boolean;
}

export interface NoteItem {
  user: string;
  date: string;
  text: string;
}

export interface UploadModalState {
  visible: boolean;
  mode: 'new' | 'version';
  title: string;
  data: any;
  autorizacionId: string | null;
}
