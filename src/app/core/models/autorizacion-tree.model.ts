export interface AutorizacionTreeNode {
  id: string;
  nombre: string;
  type: 'municipio' | 'tipo' | 'autorizacion';
  children?: AutorizacionTreeNode[];
  _open?: boolean;
  data?: any; 
  icon?: string;
}