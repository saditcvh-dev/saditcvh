export interface Role {
  id: number;
  name: string; // 'administrador', 'operador', etc.
}

// Interfaces para Auth
export interface User {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  second_last_name?: string | null;
  email: string;
  phone?: string | null;
  active?: boolean;
  cargo_id?: number | null;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
  // backend devuelve roles como array de strings
  roles: string[];
}

export interface Cargo {
  id: number;
  nombre: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  user: User;
}
