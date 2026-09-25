/** Quita SOLO el sufijo "/api" final: 'https://api.midominio.com/api' -> 'https://api.midominio.com'. */
export function apiBaseUrl(apiUrl: string): string {
  return apiUrl.replace(/\/api\/?$/, '');
}
