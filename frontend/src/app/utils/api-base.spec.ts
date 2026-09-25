import { apiBaseUrl } from './api-base';
import { ImageUrlPipe } from '../pipes/image-url.pipe';

describe('apiBaseUrl', () => {
  it('en producción (subdominio "api") solo quita el /api final', () => {
    expect(apiBaseUrl('https://api.thewayweb.com/api')).toBe('https://api.thewayweb.com');
  });
  it('funciona en desarrollo y con barra final', () => {
    expect(apiBaseUrl('http://localhost:3500/api')).toBe('http://localhost:3500');
    expect(apiBaseUrl('https://api.thewayweb.com/api/')).toBe('https://api.thewayweb.com');
  });
  it('no toca URLs sin sufijo /api', () => {
    expect(apiBaseUrl('https://api.thewayweb.com')).toBe('https://api.thewayweb.com');
  });
});

describe('ImageUrlPipe', () => {
  const pipe = new ImageUrlPipe();
  it('una imagen subida se convierte en URL absoluta válida del servidor (nunca URL rota)', () => {
    const url = pipe.transform('/uploads/foto.webp');
    expect(url).toMatch(/^https?:\/\/[^/]+\/uploads\/foto\.webp$/);
    expect(url).not.toContain('/api/');
    expect(url).not.toContain('https:/.');
  });
  it('respeta URLs absolutas y rutas de assets, y usa el placeholder sin ruta', () => {
    expect(pipe.transform('https://x.com/a.png')).toBe('https://x.com/a.png');
    expect(pipe.transform('assets/images/logo.png')).toBe('assets/images/logo.png');
    expect(pipe.transform(undefined)).toBe('assets/images/placeholder.jpg');
  });
});
