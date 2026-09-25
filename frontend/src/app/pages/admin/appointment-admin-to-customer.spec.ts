import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { AppointmentManagerComponent } from './appointment-manager.component';
import { DeliveryCalendarComponent } from '../../components/delivery-calendar/delivery-calendar.component';
import { AppointmentService } from '../../services/appointment.service';
import { ToastService } from '../../services/toast.service';
import { fake, fakeBackendInterceptor, baseConfig, fmt, nextDateWithWeekday, settle } from '../../testing/fake-backend';

/**
 * Flujo completo: el administrador cambia la disponibilidad en el panel, guarda, y el cliente
 * (calendario del checkout) tiene que ver exactamente lo configurado.
 */
describe('Panel de disponibilidad (admin) → calendario del cliente', () => {
  let toasts: ToastService;

  beforeEach(() => {
    fake.reset();
    fake.loginAs('admin');
    fake.config = baseConfig();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(withInterceptors([fakeBackendInterceptor]))]
    });
    toasts = TestBed.inject(ToastService);
  });

  async function openAdmin() {
    const fixture = TestBed.createComponent(AppointmentManagerComponent);
    fixture.detectChanges();
    await settle(fixture);
    return fixture;
  }

  async function openCustomerCalendar() {
    fake.loginAs('customer');
    const fixture = TestBed.createComponent(DeliveryCalendarComponent);
    fixture.detectChanges();
    await settle(fixture);
    return fixture;
  }

  const cells = (f: ComponentFixture<any>, sel: string) => Array.from<HTMLElement>(f.nativeElement.querySelectorAll(sel));
  const adminCell = (f: ComponentFixture<any>, dateStr: string) => {
    const c = f.componentInstance.calendarDays.findIndex((x: any) => x.dateStr === dateStr && x.currentMonth);
    return cells(f, '.calendar-day')[c];
  };
  const customerAvailable = (f: ComponentFixture<any>) =>
    cells(f, '.day-cell.available .day-number').map(e => Number(e.textContent!.trim()));
  const lastToast = () => toasts.toasts()[toasts.toasts().length - 1];

  // Día de este mes (o del siguiente) a partir de mañana, para no depender de la fecha de ejecución.
  const inCurrentMonth = (offsetDays: number) => {
    const d = new Date(); d.setDate(d.getDate() + offsetDays); return d;
  };

  describe('Días de reparto (calendario del admin)', () => {
    it('el calendario del admin refleja los días guardados como activos', async () => {
      const a = nextDateWithWeekday(2); const b = nextDateWithWeekday(4);
      fake.config = baseConfig({ deliveryDays: [fmt(a), fmt(b)] });
      const f = await openAdmin();
      const comp = f.componentInstance as AppointmentManagerComponent;
      comp.currentDate = new Date(a.getFullYear(), a.getMonth(), 1); comp.generateCalendar(); f.detectChanges();
      const activos = cells(f, '.calendar-day.active').map(e => e.textContent!.trim());
      expect(activos).toContain(String(a.getDate()));
    });

    it('clic en un día lo activa y otro clic lo desactiva', async () => {
      const f = await openAdmin();
      const comp = f.componentInstance as AppointmentManagerComponent;
      const target = fmt(nextDateWithWeekday(2));
      comp.currentDate = new Date(target + 'T12:00:00'); comp.generateCalendar(); f.detectChanges();
      adminCell(f, target).click(); f.detectChanges();
      expect(comp.config()!.deliveryDays).toEqual([target]);
      expect(adminCell(f, target).classList).toContain('active');
      adminCell(f, target).click(); f.detectChanges();
      expect(comp.config()!.deliveryDays).toEqual([]);
      expect(adminCell(f, target).classList).not.toContain('active');
    });

    it('selección de periodo (doble clic + clic) activa todo el rango, sea cual sea el orden', async () => {
      const f = await openAdmin();
      const comp = f.componentInstance as AppointmentManagerComponent;
      const start = nextDateWithWeekday(1, 3);
      const end = new Date(start); end.setDate(end.getDate() + 6);
      comp.selectionStart = fmt(end); // orden invertido
      comp.handleDayClick(fmt(start));
      expect(comp.config()!.deliveryDays.sort()).toEqual(Array.from({ length: 7 }, (_, i) => { const d = new Date(start); d.setDate(d.getDate() + i); return fmt(d); }));
      // segundo periodo sobre el mismo rango partiendo de un día activo → desactiva todo
      comp.selectionStart = fmt(start);
      comp.handleDayClick(fmt(end));
      expect(comp.config()!.deliveryDays).toEqual([]);
    });

    it('un periodo que cruza fin de mes y de año activa los días correctos', async () => {
      const f = await openAdmin();
      const comp = f.componentInstance as AppointmentManagerComponent;
      const y = new Date().getFullYear() + 1;
      comp.selectionStart = `${y}-12-30`;
      comp.handleDayClick(`${y + 1}-01-02`);
      expect(comp.config()!.deliveryDays.sort()).toEqual([`${y}-12-30`, `${y}-12-31`, `${y + 1}-01-01`, `${y + 1}-01-02`]);
    });

    it('navegar al mes siguiente desde el día 31 debe mostrar el mes siguiente (no saltarse uno)', async () => {
      const f = await openAdmin();
      const comp = f.componentInstance as AppointmentManagerComponent;
      comp.currentDate = new Date(2026, 0, 31);
      comp.nextMonth();
      expect(comp.currentDate.getMonth()).withContext('febrero = 1').toBe(1);
    });

    it('navegar al mes anterior desde el día 31 debe mostrar el mes anterior', async () => {
      const f = await openAdmin();
      const comp = f.componentInstance as AppointmentManagerComponent;
      comp.currentDate = new Date(2026, 2, 31); // 31 marzo
      comp.prevMonth();
      expect(comp.currentDate.getMonth()).withContext('febrero = 1').toBe(1);
    });
  });

  describe('Tramos horarios (admin)', () => {
    it('añadir un tramo lo guarda ordenado por hora', async () => {
      const f = await openAdmin();
      const comp = f.componentInstance as AppointmentManagerComponent;
      comp.activeDayId.set('1');
      comp.newSlot = { start: '16:00', end: '18:00' }; comp.addSlot();
      comp.newSlot = { start: '07:00', end: '08:00' }; comp.addSlot();
      expect(comp.config()!.dailySlots['1'].map(r => `${r.start}-${r.end}`)).toEqual(['07:00-08:00', '09:00-13:00', '16:00-18:00']);
    });

    it('rechaza inicio >= fin', async () => {
      const f = await openAdmin();
      const comp = f.componentInstance as AppointmentManagerComponent;
      const before = JSON.stringify(comp.config()!.dailySlots);
      comp.activeDayId.set('1');
      comp.newSlot = { start: '14:00', end: '14:00' }; comp.addSlot();
      expect(lastToast().type).toBe('error');
      comp.newSlot = { start: '15:00', end: '14:00' }; comp.addSlot();
      expect(JSON.stringify(comp.config()!.dailySlots)).toBe(before);
    });

    it('rechaza tramos solapados y acepta tramos contiguos', async () => {
      const f = await openAdmin();
      const comp = f.componentInstance as AppointmentManagerComponent;
      comp.activeDayId.set('1'); // ya tiene 09:00-13:00
      comp.newSlot = { start: '12:00', end: '14:00' }; comp.addSlot();
      expect(lastToast().message).toContain('solapa');
      expect(comp.config()!.dailySlots['1'].length).toBe(1);
      comp.newSlot = { start: '13:00', end: '14:00' }; comp.addSlot();
      expect(comp.config()!.dailySlots['1'].length).toBe(2);
    });

    it('un tramo dentro de otro también se considera solapado', async () => {
      const f = await openAdmin();
      const comp = f.componentInstance as AppointmentManagerComponent;
      comp.activeDayId.set('1');
      comp.newSlot = { start: '10:00', end: '11:00' }; comp.addSlot();
      expect(comp.config()!.dailySlots['1'].length).toBe(1);
    });

    it('eliminar un tramo lo quita solo de ese día', async () => {
      const f = await openAdmin();
      const comp = f.componentInstance as AppointmentManagerComponent;
      comp.removeSlot('1', 0);
      expect(comp.config()!.dailySlots['1']).toEqual([]);
      expect(comp.config()!.dailySlots['2'].length).toBe(1);
    });

    it('copiar los tramos de un día a otros los duplica sin compartir referencias', async () => {
      const f = await openAdmin();
      const comp = f.componentInstance as AppointmentManagerComponent;
      comp.activeDayId.set('1'); comp.newSlot = { start: '16:00', end: '18:00' }; comp.addSlot();
      comp.handleCopyClick('1'); comp.handleCopyClick('6'); comp.handleCopyClick('0'); comp.handleCopyClick('1');
      const want = [{ start: '09:00', end: '13:00' }, { start: '16:00', end: '18:00' }];
      expect(comp.config()!.dailySlots['6']).toEqual(want);
      expect(comp.config()!.dailySlots['0']).toEqual(want);
      comp.removeSlot('6', 0);
      expect(comp.config()!.dailySlots['0']).toEqual(want);
      expect(comp.config()!.dailySlots['1']).toEqual(want);
    });

    it('la lista de horas del selector solo tiene múltiplos de 30 min (48 opciones)', async () => {
      const f = await openAdmin();
      const comp = f.componentInstance as AppointmentManagerComponent;
      expect(comp.possibleTimes.length).toBe(48);
      expect(comp.possibleTimes.every(t => t.endsWith(':00') || t.endsWith(':30'))).toBeTrue();
    });
  });

  describe('Guardado y efecto en el cliente', () => {
    it('lo que el admin activa y guarda es exactamente lo que el cliente ve como disponible en el calendario', async () => {
      const f = await openAdmin();
      const comp = f.componentInstance as AppointmentManagerComponent;

      // Activamos 3 días laborables de las próximas 3 semanas (dentro del mes visible del cliente = mes actual)
      const now = new Date();
      const days: string[] = [];
      for (let i = 1; i <= 27 && days.length < 3; i++) {
        const d = inCurrentMonth(i);
        if (d.getMonth() !== now.getMonth()) break;
        if (d.getDay() >= 1 && d.getDay() <= 5) days.push(fmt(d));
      }
      if (days.length === 0) { pending('fin de mes: no hay días laborables restantes'); return; }
      comp.currentDate = new Date(now.getFullYear(), now.getMonth(), 1); comp.generateCalendar();
      days.forEach(d => comp.toggleDay(d));
      await comp.saveConfig();
      expect(fake.postedConfigs.length).toBe(1);
      expect(fake.postedConfigs[0].deliveryDays.sort()).toEqual([...days].sort());

      const customer = await openCustomerCalendar();
      const want = days.map(d => Number(d.slice(8))).sort((a, b) => a - b);
      expect(customerAvailable(customer).sort((a, b) => a - b)).toEqual(want);
    });

    it('si el admin quita el horario de un día de la semana, sus días activos desaparecen del cliente', async () => {
      const d = nextDateWithWeekday(2, 1);
      const now = new Date();
      if (d.getMonth() !== now.getMonth()) { pending('el próximo martes cae en otro mes'); return; }
      fake.config = baseConfig({ deliveryDays: [fmt(d)] });

      let customer = await openCustomerCalendar();
      expect(customerAvailable(customer)).toEqual([d.getDate()]);
      customer.destroy();

      const f = await openAdmin();
      const comp = f.componentInstance as AppointmentManagerComponent;
      comp.removeSlot('2', 0);
      await comp.saveConfig();

      customer = await openCustomerCalendar();
      expect(customerAvailable(customer)).toEqual([]);
      const cell = cells(customer, '.day-cell.unavailable').find(c => c.textContent!.includes(String(d.getDate())))!;
      expect(cell.getAttribute('title')).toBe('Sin horario configurado');
    });

    it('una reserva que llena todas las horas de un día lo hace desaparecer como disponible para el cliente', async () => {
      const d = nextDateWithWeekday(3, 1);
      const now = new Date();
      if (d.getMonth() !== now.getMonth()) { pending('el próximo miércoles cae en otro mes'); return; }
      fake.config = baseConfig({ deliveryDays: [fmt(d)] });
      fake.config.dailySlots['3'] = [{ start: '09:00', end: '10:00' }];
      fake.orders = [{ id: 'x', status: 'paid', customer_uid: 'me', delivery_date: fmt(d), delivery_timeSlot: '09:00' }];
      const customer = await openCustomerCalendar();
      expect(customerAvailable(customer)).toEqual([]);
      const cell = cells(customer, '.day-cell.unavailable').find(c => c.textContent!.includes(String(d.getDate())))!;
      expect(cell.getAttribute('title')).toBe('Todas las horas bloqueadas');
    });

    it('si el guardado falla en el servidor el admin debe ver un error, no "guardado"', async () => {
      const f = await openAdmin();
      const comp = f.componentInstance as AppointmentManagerComponent;
      fake.saveStatus = 500;
      await comp.saveConfig();
      expect(lastToast().type).toBe('error');
    });

    it('con la sesión caducada (401) el aviso indica cerrar sesión y volver a entrar', async () => {
      const f = await openAdmin();
      const comp = f.componentInstance as AppointmentManagerComponent;
      fake.saveStatus = 401;
      await comp.saveConfig();
      expect(lastToast().type).toBe('error');
      expect(lastToast().message).toContain('sesión');
    });

    it('si el guardado falla, los cambios deben seguir marcados como pendientes', async () => {
      const f = await openAdmin();
      const comp = f.componentInstance as AppointmentManagerComponent;
      comp.toggleDay(fmt(nextDateWithWeekday(2)));
      fake.saveStatus = 500;
      await comp.saveConfig();
      expect(comp.isModified()).toBeTrue();
    });
  });

  describe('Calendario del cliente (checkout)', () => {
    it('cada día se pinta bajo su columna de día de la semana (lunes primero)', async () => {
      const customer = await openCustomerCalendar();
      const grid = customer.nativeElement.querySelector('.calendar-grid') as HTMLElement;
      const children = Array.from(grid.children) as HTMLElement[];
      const header = children.slice(0, 7).map(c => c.textContent!.trim());
      expect(header).toEqual(['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']);
      const now = new Date();
      children.slice(7).forEach((el, idx) => {
        if (el.classList.contains('not-current')) return;
        const day = Number(el.querySelector('.day-number')!.textContent!.trim());
        const jsDay = new Date(now.getFullYear(), now.getMonth(), day).getDay();
        expect(idx % 7).withContext('día ' + day).toBe((jsDay + 6) % 7);
      });
    });

    it('el panel del admin también coloca los días bajo la columna correcta', async () => {
      const f = await openAdmin();
      const grid = f.nativeElement.querySelector('.calendar-grid') as HTMLElement;
      const children = Array.from(grid.children) as HTMLElement[];
      const now = new Date();
      children.slice(7).forEach((el, idx) => {
        if (el.classList.contains('not-current')) return;
        const day = Number(el.textContent!.trim());
        const jsDay = new Date(now.getFullYear(), now.getMonth(), day).getDay();
        expect(idx % 7).withContext('día ' + day).toBe((jsDay + 6) % 7);
      });
    });

    it('un clic en un día disponible emite la fecha; en uno no disponible no emite nada', async () => {
      const d = nextDateWithWeekday(2, 1);
      const now = new Date();
      if (d.getMonth() !== now.getMonth()) { pending('el próximo martes cae en otro mes'); return; }
      fake.config = baseConfig({ deliveryDays: [fmt(d)] });
      const customer = await openCustomerCalendar();
      const emitted: string[] = [];
      customer.componentInstance.dateSelected.subscribe((v: string) => emitted.push(v));
      const all = cells(customer, '.day-cell:not(.not-current)');
      all.forEach(c => c.click());
      expect(emitted).toEqual([fmt(d)]);
    });

    it('el botón "mes anterior" está deshabilitado en el mes actual y "siguiente" carga el mes siguiente', async () => {
      const dNext = new Date(); dNext.setMonth(dNext.getMonth() + 1, 1);
      const target = new Date(dNext.getFullYear(), dNext.getMonth(), 10);
      while (target.getDay() !== 3) target.setDate(target.getDate() + 1);
      fake.config = baseConfig({ deliveryDays: [fmt(target)] });
      const customer = await openCustomerCalendar();
      const [prev, next] = cells(customer, '.nav-btn') as HTMLButtonElement[];
      expect(prev.disabled).toBeTrue();
      next.click(); await settle(customer);
      expect(prev.disabled).toBeFalse();
      expect(customerAvailable(customer)).toEqual([target.getDate()]);
      prev.click(); await settle(customer);
      expect(customerAvailable(customer)).not.toContain(target.getDate());
    });

    it('avanzar 13 meses y volver mantiene el mes/año coherentes con las fechas consultadas', async () => {
      const customer = await openCustomerCalendar();
      const next = cells(customer, '.nav-btn')[1] as HTMLButtonElement;
      const svc = TestBed.inject(AppointmentService);
      const spy = spyOn(svc, 'getMonthAvailability').and.callThrough();
      for (let i = 0; i < 13; i++) { next.click(); await settle(customer, 2); }
      const now = new Date();
      const last = spy.calls.mostRecent().args;
      const expected = new Date(now.getFullYear(), now.getMonth() + 13, 1);
      expect([last[0], last[1]]).toEqual([expected.getFullYear(), expected.getMonth()]);
    });
  });
});
