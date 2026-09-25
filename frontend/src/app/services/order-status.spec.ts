import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { OrderService } from './order.service';

describe('OrderService: estado del pedido y cabecera de sesión', () => {
  let service: OrderService;
  let http: HttpTestingController;

  beforeEach(() => {
    localStorage.removeItem('token');
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(OrderService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => { http.verify(); localStorage.removeItem('token'); });

  it('consulta el estado por el endpoint público y sin cabecera Authorization', async () => {
    const p = service.getOrderStatus('123');
    const req = http.expectOne(r => r.url.endsWith('/orders/123/status'));
    expect(req.request.headers.has('Authorization')).toBeFalse();
    req.flush({ status: 'paid' });
    expect(await p).toBe('paid');
  });

  it('si falla la consulta devuelve null en lugar de lanzar error', async () => {
    const p = service.getOrderStatus('123');
    http.expectOne(r => r.url.endsWith('/orders/123/status')).flush({}, { status: 404, statusText: 'Not Found' });
    expect(await p).toBeNull();
  });

  it('un invitado (sin token) nunca envía "Bearer null"', async () => {
    const p = service.getOrderById('123');
    const req = http.expectOne(r => r.url.endsWith('/orders/123'));
    expect(req.request.headers.get('Authorization')).toBeNull();
    req.flush({}, { status: 401, statusText: 'Unauthorized' });
    await p;
  });

  it('con sesión iniciada sí envía el token', async () => {
    localStorage.setItem('token', 'abc');
    const p = service.getOrderById('123');
    const req = http.expectOne(r => r.url.endsWith('/orders/123'));
    expect(req.request.headers.get('Authorization')).toBe('Bearer abc');
    req.flush({});
    await p;
  });
});
