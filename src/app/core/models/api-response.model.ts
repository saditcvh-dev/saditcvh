export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T; // T será el tipo de dato real que devuelve el endpoint (ej. User[], Role[], Cargo[])
} 
