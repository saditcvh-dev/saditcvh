export type ViewerTab = 'preview-png' | 'preview-pdf' | 'metadata' | 'security' | 'notes' | 'history' | 'ocr-search' | 'additional-actions';
const TABS_BY_ROLE: Record<string, ViewerTab[]> = {
  administrador: ['preview-png', 'preview-pdf', 'metadata', 'security', 'history', 'notes', 'ocr-search', 'additional-actions'],
  operador: ['preview-png', 'preview-pdf', 'metadata', 'history', 'notes', 'ocr-search', 'additional-actions'],
  consulta: ['preview-png', 'preview-pdf', 'metadata', 'history', 'ocr-search'],
};

export function getAllowedTabsByRoles(roles: string[]): ViewerTab[] {
  const tabs = new Set<ViewerTab>();

  roles.forEach(role => {
    TABS_BY_ROLE[role]?.forEach(tab => tabs.add(tab));
  });

  return Array.from(tabs);
}
