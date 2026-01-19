export type ViewerTab = 'preview' | 'metadata' | 'security' | 'notes' | 'history';
const TABS_BY_ROLE: Record<string, ViewerTab[]> = {
  administrador: ['preview', 'metadata', 'security', 'history', 'notes'],
  operador: ['preview', 'metadata', 'history', 'notes'],
  consulta: ['preview', 'metadata', 'history'],
};

export function getAllowedTabsByRoles(roles: string[]): ViewerTab[] {
  const tabs = new Set<ViewerTab>();

  roles.forEach(role => {
    TABS_BY_ROLE[role]?.forEach(tab => tabs.add(tab));
  });

  return Array.from(tabs);
}
