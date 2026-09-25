import { NO_ERRORS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter, RouterModule } from '@angular/router';
import { CheckoutComponent } from './checkout.component';
import { DeliveryCalendarComponent } from '../../components/delivery-calendar/delivery-calendar.component';
import { CartStore } from '../../store/cart.store';
import { fake, fakeBackendInterceptor, baseConfig, fmt, nextDateWithWeekday, settle } from '../../testing/fake-backend';

/**
 * Checkout real (calendario + desplegable de horas) frente a la configuración del administrador.
 */
describe('Checkout: fecha y hora de entrega frente a la configuración', () => {
  let fixture: ComponentFixture<CheckoutComponent>;

  // Miércoles del mes actual (o, si ya no queda ninguno, no se puede ejecutar)
  const dayInThisMonth = (weekday: number) => {
    const d = nextDateWithWeekday(weekday, 1);
    return d.getMonth() === new Date().getMonth() ? d : null;
  };

  async function openCheckout(role: 'admin' | 'customer' | 'guest' = 'customer') {
    fake.loginAs(role);
    TestBed.inject(CartStore).setItems([{ product: { id: 'p', price: 10, name: 'x' } as any, quantity: 1 }]);
    fixture = TestBed.createComponent(CheckoutComponent);
    fixture.detectChanges();
    await settle(fixture);
  }

  const q = (sel: string) => fixture.nativeElement.querySelector(sel) as HTMLElement | null;
  const qa = (sel: string) => Array.from<HTMLElement>(fixture.nativeElement.querySelectorAll(sel));
  const clickDay = async (day: number) => {
    const cell = qa('.day-cell:not(.not-current)').find(c => c.querySelector('.day-number')!.textContent!.trim() === String(day))!;
    cell.click();
    await settle(fixture);
  };
  const options = () => qa('select[formControlName="timeSlot"] option').filter(o => (o as HTMLOptionElement).value !== '') as HTMLOptionElement[];

  beforeEach(() => {
    fake.reset();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(withInterceptors([fakeBackendInterceptor])), provideRouter([])]
    });
    TestBed.overrideComponent(CheckoutComponent, {
      set: { imports: [CommonModule, ReactiveFormsModule, RouterModule, DeliveryCalendarComponent], schemas: [NO_ERRORS_SCHEMA] }
    });
  });

  it('al elegir un día disponible aparece el desplegable con exactamente las horas configuradas', async () => {
    const d = dayInThisMonth(3);
    if (!d) { pending('no queda ningún miércoles este mes'); return; }
    fake.config = baseConfig({ deliveryDays: [fmt(d)] });
    fake.config.dailySlots['3'] = [{ start: '09:00', end: '10:30' }, { start: '17:00', end: '18:00' }];
    await openCheckout('customer');

    expect(q('select[formControlName="timeSlot"]')).toBeNull(); // sin fecha no hay horas
    await clickDay(d.getDate());
    expect(fixture.componentInstance.checkoutForm.value.date).toBe(fmt(d));
    expect(options().map(o => o.value)).toEqual(['09:00', '09:30', '10:00', '17:00', '17:30']);
    expect(options().every(o => !o.disabled)).toBeTrue();
  });

  it('un día no disponible no se puede seleccionar', async () => {
    const d = dayInThisMonth(3);
    if (!d) { pending('no queda ningún miércoles este mes'); return; }
    fake.config = baseConfig({ deliveryDays: [] });
    await openCheckout('customer');
    await clickDay(d.getDate());
    expect(fixture.componentInstance.checkoutForm.value.date).toBe('');
    expect(q('select[formControlName="timeSlot"]')).toBeNull();
  });

  it('las horas reservadas por otro pedido aparecen deshabilitadas (usuario que ve todas las reservas)', async () => {
    const d = dayInThisMonth(3);
    if (!d) { pending('no queda ningún miércoles este mes'); return; }
    fake.config = baseConfig({ deliveryDays: [fmt(d)] });
    fake.orders = [{ id: 'o1', status: 'paid', customer_uid: 'other', delivery_date: fmt(d), delivery_timeSlot: '10:30' }];
    await openCheckout('admin');
    await clickDay(d.getDate());
    const disabled = options().filter(o => o.disabled).map(o => o.value);
    expect(disabled).toEqual(['09:30', '10:00', '10:30', '11:00']);
  });

  it('un invitado también debe ver deshabilitadas las horas ya reservadas por otros', async () => {
    const d = dayInThisMonth(3);
    if (!d) { pending('no queda ningún miércoles este mes'); return; }
    fake.config = baseConfig({ deliveryDays: [fmt(d)] });
    fake.orders = [{ id: 'o1', status: 'paid', customer_uid: 'other', delivery_date: fmt(d), delivery_timeSlot: '10:30' }];
    await openCheckout('guest');
    await clickDay(d.getDate());
    expect(options().filter(o => o.disabled).map(o => o.value)).toContain('10:30');
  });

  it('al cambiar de día se vacía la hora elegida y se cargan las horas del nuevo día', async () => {
    const d1 = dayInThisMonth(2); const d2 = dayInThisMonth(3);
    if (!d1 || !d2) { pending('no quedan martes y miércoles este mes'); return; }
    fake.config = baseConfig({ deliveryDays: [fmt(d1), fmt(d2)] });
    fake.config.dailySlots['2'] = [{ start: '09:00', end: '10:00' }];
    fake.config.dailySlots['3'] = [{ start: '15:00', end: '16:00' }];
    await openCheckout('customer');
    await clickDay(d1.getDate());
    expect(options().map(o => o.value)).toEqual(['09:00', '09:30']);
    fixture.componentInstance.checkoutForm.get('timeSlot')!.setValue('09:30');
    await clickDay(d2.getDate());
    expect(fixture.componentInstance.checkoutForm.value.timeSlot).toBe('');
    expect(options().map(o => o.value)).toEqual(['15:00', '15:30']);
  });

  it('todos los días en verde del calendario ofrecen al menos una hora seleccionable', async () => {
    const days = [1, 2, 3, 4, 5].map(dayInThisMonth).filter((d): d is Date => !!d);
    if (days.length === 0) { pending('fin de mes'); return; }
    fake.config = baseConfig({ deliveryDays: days.map(fmt) });
    fake.orders = [{ id: 'o1', status: 'paid', customer_uid: 'me', delivery_date: fmt(days[0]), delivery_timeSlot: '09:00' }];
    await openCheckout('admin');
    const green = qa('.day-cell.available .day-number').map(e => Number(e.textContent!.trim()));
    expect(green.length).toBe(days.length);
    for (const day of green) {
      await clickDay(day);
      expect(options().some(o => !o.disabled)).withContext('día ' + day).toBeTrue();
    }
  });
});
