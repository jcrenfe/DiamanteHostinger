import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { MyOrdersComponent } from './my-orders.component';
import { AuthStore } from '../../store/auth.store';
import { fake, fakeBackendInterceptor, settle } from '../../testing/fake-backend';

/**
 * Mis Pedidos con datos en el formato REAL del backend (filas planas de MySQL, createdAt como texto ISO)
 * y el menú de hamburguesa de la cabecera dentro de esa misma página.
 */
describe('Mis Pedidos', () => {
  let fixture: ComponentFixture<MyOrdersComponent>;
  const errors: any[] = [];

  const setUser = (role: 'cliente' | 'admin') =>
    TestBed.inject(AuthStore).setUser({ uid: 'me', email: 'ana@x.com', displayName: 'Ana', photoURL: null, role });

  async function open(role: 'cliente' | 'admin' = 'cliente') {
    fake.loginAs(role === 'admin' ? 'admin' : 'customer');
    setUser(role);
    fixture = TestBed.createComponent(MyOrdersComponent);
    fixture.detectChanges();
    await settle(fixture);
  }
  const text = () => (fixture.nativeElement as HTMLElement).innerText;
  const cards = () => Array.from<HTMLElement>(fixture.nativeElement.querySelectorAll('.order-card'));

  beforeEach(() => {
    fake.reset();
    errors.length = 0;
    fake.orders = [
      { id: 'aaaaaaaa-1111', status: 'paid', customer_uid: 'me', delivery_date: '2026-10-05', delivery_timeSlot: '10:00', total: 45.5, createdAt: '2026-09-25T10:15:00.000Z',
        items: [{ name: 'DESAYUNO CON DIAMANTES', quantity: 2, price: 35, productId: 'p1' }, { name: 'GLOBO ADICIONAL', quantity: 1, price: 5.5 }] },
      { id: 'bbbbbbbb-2222', status: 'pending', customer_uid: 'me', delivery_date: '2026-10-06', delivery_timeSlot: '11:30', total: 30, createdAt: '2026-09-26T09:00:00.000Z', items: [] },
      { id: 'cccccccc-3333', status: 'paid', customer_uid: 'otra-persona', delivery_date: '2026-10-07', delivery_timeSlot: '12:00', total: 99, createdAt: '2026-09-27T09:00:00.000Z',
        items: [{ name: 'PEDIDO AJENO', quantity: 1, price: 99 }] }
    ];
    TestBed.configureTestingModule({
      providers: [provideHttpClient(withInterceptors([fakeBackendInterceptor])), provideRouter([{ path: 'mis-pedidos', component: MyOrdersComponent }])]
    });
  });

  it('muestra solo mis pedidos, con fecha de alta, entrega, total y productos', async () => {
    await open();
    expect(cards().length).toBe(2);
    const t = text();
    expect(t).toContain('2x DESAYUNO CON DIAMANTES');
    expect(t).toContain('1x GLOBO ADICIONAL');
    expect(t).toContain('2026-10-05 (10:00)');
    expect(t).toMatch(/\d{2}\/\d{2}\/2026 \d{2}:\d{2}/);
    expect(t).toContain('45.50€');
    expect(t.toLowerCase()).toContain('pagado');
    expect(t.toLowerCase()).toContain('pendiente de pago');
    expect(t).not.toContain('PEDIDO AJENO');
    expect(t).not.toContain('99.00€');
  });

  it('un administrador ve en Mis Pedidos solo SUS pedidos, no los de todos los clientes', async () => {
    await open('admin');
    expect(cards().length).toBe(2);
    expect(text()).not.toContain('PEDIDO AJENO');
  });

  it('el pedido más reciente aparece primero y un pedido sin líneas no rompe la página', async () => {
    await open();
    expect(cards()[0].innerText).toContain('bbbbbbbb');
    expect(cards()[1].innerText).toContain('aaaaaaaa');
  });

  it('sin pedidos muestra el mensaje de "Aún no has hecho ningún pedido"', async () => {
    fake.orders = [];
    await open();
    expect(text()).toContain('Aún no has hecho ningún pedido');
  });

  describe('menú de hamburguesa (cabecera dentro de Mis Pedidos)', () => {
    const burger = () => fixture.nativeElement.querySelector('.btn-menu-mobile') as HTMLButtonElement;
    const nav = () => fixture.nativeElement.querySelector('nav.nav') as HTMLElement;

    it('abre y cierra al pulsar la hamburguesa', async () => {
      await open();
      expect(nav().classList).not.toContain('mobile-open');
      burger().click(); await settle(fixture);
      expect(nav().classList).toContain('mobile-open');
      burger().click(); await settle(fixture);
      expect(nav().classList).not.toContain('mobile-open');
    });

    it('el enlace "Mis Pedidos" del menú está y, al pulsarlo, cierra el menú', async () => {
      await open();
      burger().click(); await settle(fixture);
      const link = Array.from<HTMLAnchorElement>(nav().querySelectorAll('a')).find(a => a.textContent!.includes('Mis Pedidos'))!;
      expect(link).toBeTruthy();
      expect(link.getAttribute('href')).toBe('/mis-pedidos');
      link.click(); await settle(fixture);
      expect(nav().classList).not.toContain('mobile-open');
    });

    it('la página no lanza errores de renderizado (que dejarían la cabecera sin responder)', async () => {
      const handler = spyOn(console, 'error').and.callFake((...a: any[]) => errors.push(a));
      await open();
      burger().click(); await settle(fixture);
      expect(errors.map(e => String(e[0]).slice(0, 120))).toEqual([]);
      expect(handler).not.toHaveBeenCalled();
    });
  });
});
