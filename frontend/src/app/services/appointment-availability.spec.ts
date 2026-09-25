import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { AppointmentService, AppointmentConfig } from './appointment.service';
import { fake, fakeBackendInterceptor, baseConfig, fmt, nextDateWithWeekday } from '../testing/fake-backend';

/**
 * Coherencia entre lo que el administrador CONFIGURA (deliveryDays, dailySlots, blockingRules)
 * y lo que el CLIENTE ve (calendario mensual + desplegable de horas).
 */
describe('Disponibilidad de entrega: configuración vs. lo que ve el cliente', () => {
  let service: AppointmentService;

  beforeEach(() => {
    fake.reset();
    fake.loginAs('admin');
    TestBed.configureTestingModule({
      providers: [provideHttpClient(withInterceptors([fakeBackendInterceptor]))]
    });
    service = TestBed.inject(AppointmentService);
  });

  const monthOf = (d: Date) => service.getMonthAvailability(d.getFullYear(), d.getMonth());
  const freeTimes = async (date: string) => (await service.getAvailableSlots(date)).filter(s => s.available).map(s => s.time);
  const allTimes = async (date: string) => (await service.getAvailableSlots(date)).map(s => s.time);
  const order = (date: string, time: string, extra: any = {}) => ({
    id: `o-${Math.random()}`, status: 'paid', customer_uid: 'other', delivery_date: date, delivery_timeSlot: time, ...extra
  });

  // Invariante central: día "disponible" en el calendario <=> hay alguna hora libre en el desplegable.
  async function expectCalendarAndSlotsAgree(year: number, month: number) {
    const cal = await service.getMonthAvailability(year, month);
    const today = fmt(new Date());
    for (const [dateStr, info] of Object.entries(cal)) {
      if (dateStr < today) continue;
      const free = (await service.getAvailableSlots(dateStr)).filter(s => s.available).length;
      expect(info.available).withContext(`${dateStr} calendario=${info.available} (${info.reason}) horasLibres=${free}`).toBe(free > 0);
    }
  }

  describe('Días de reparto (deliveryDays)', () => {
    it('sin configuración guardada (404) ningún día está disponible', async () => {
      const d = nextDateWithWeekday(2);
      const cal = await monthOf(d);
      expect(Object.values(cal).some(v => v.available)).toBeFalse();
      expect(await allTimes(fmt(d))).toEqual([]);
    });

    it('un día laborable que NO está marcado en el panel no se ofrece', async () => {
      const d = nextDateWithWeekday(2);
      fake.config = baseConfig({ deliveryDays: [] });
      expect((await monthOf(d))[fmt(d)]).toEqual({ available: false, reason: 'No disponible para reparto' });
      expect(await allTimes(fmt(d))).toEqual([]);
    });

    it('un día marcado con horario semanal se ofrece y el resto del mes no', async () => {
      const d = nextDateWithWeekday(3);
      fake.config = baseConfig({ deliveryDays: [fmt(d)] });
      const cal = await monthOf(d);
      const disponibles = Object.entries(cal).filter(([, v]) => v.available).map(([k]) => k);
      expect(disponibles).toEqual([fmt(d)]);
    });

    it('un día marcado cuyo día de la semana no tiene tramos queda no disponible', async () => {
      const sat = nextDateWithWeekday(6);
      fake.config = baseConfig({ deliveryDays: [fmt(sat)] }); // sábados sin tramos
      expect((await monthOf(sat))[fmt(sat)]).toEqual({ available: false, reason: 'Sin horario configurado' });
      expect(await allTimes(fmt(sat))).toEqual([]);
    });

    it('los días pasados nunca están disponibles aunque estén marcados', async () => {
      const now = new Date();
      const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
      fake.config = baseConfig({ deliveryDays: [fmt(yesterday)] });
      // Ponemos horario todos los días para que solo el "pasado" pueda descartarlo
      const all = { '0': [{ start: '09:00', end: '10:00' }], '1': [{ start: '09:00', end: '10:00' }], '2': [{ start: '09:00', end: '10:00' }], '3': [{ start: '09:00', end: '10:00' }], '4': [{ start: '09:00', end: '10:00' }], '5': [{ start: '09:00', end: '10:00' }], '6': [{ start: '09:00', end: '10:00' }] };
      fake.config.dailySlots = all;
      expect((await monthOf(yesterday))[fmt(yesterday)]).toEqual({ available: false, reason: 'Día pasado' });
    });

    it('el día de hoy está disponible si está marcado y tiene tramos', async () => {
      const today = new Date();
      const dailySlots: any = {};
      for (let i = 0; i < 7; i++) dailySlots[String(i)] = [{ start: '00:00', end: '23:30' }];
      fake.config = baseConfig({ deliveryDays: [fmt(today)], dailySlots });
      expect((await monthOf(today))[fmt(today)].available).toBeTrue();
    });

    it('cambio de año: diciembre y enero se calculan con su propio mes', async () => {
      const dec = new Date(new Date().getFullYear() + 1, 11, 15);
      const jan = new Date(new Date().getFullYear() + 2, 0, 15);
      const dailySlots: any = {};
      for (let i = 0; i < 7; i++) dailySlots[String(i)] = [{ start: '09:00', end: '10:00' }];
      fake.config = baseConfig({ deliveryDays: [fmt(dec), fmt(jan)], dailySlots });
      expect((await service.getMonthAvailability(dec.getFullYear(), 11))[fmt(dec)].available).toBeTrue();
      expect((await service.getMonthAvailability(jan.getFullYear(), 0))[fmt(jan)].available).toBeTrue();
      expect(Object.keys(await service.getMonthAvailability(jan.getFullYear(), 0)).length).toBe(31);
    });
  });

  describe('Tramos horarios por día de la semana (dailySlots)', () => {
    for (const wd of [0, 1, 2, 3, 4, 5, 6]) {
      it(`el tramo configurado en la clave "${wd}" solo afecta a ese día de la semana`, async () => {
        const date = nextDateWithWeekday(wd);
        const next = new Date(date); next.setDate(next.getDate() + 1); // día siguiente, otro weekday
        const dailySlots: any = { '0': [], '1': [], '2': [], '3': [], '4': [], '5': [], '6': [] };
        dailySlots[String(wd)] = [{ start: '10:00', end: '11:00' }];
        fake.config = baseConfig({ deliveryDays: [fmt(date), fmt(next)], dailySlots });

        expect(await freeTimes(fmt(date))).toEqual(['10:00', '10:30']);
        expect(await allTimes(fmt(next))).toEqual([]);
        expect((await monthOf(date))[fmt(date)].available).toBeTrue();
        const nextInfo = (await service.getMonthAvailability(next.getFullYear(), next.getMonth()))[fmt(next)];
        expect(nextInfo.available).toBeFalse();
      });
    }

    it('genera intervalos de 30 min y el fin del tramo es exclusivo', async () => {
      const d = nextDateWithWeekday(2);
      fake.config = baseConfig({ deliveryDays: [fmt(d)] });
      expect(await allTimes(fmt(d))).toEqual(['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '12:30']);
    });

    it('varios tramos el mismo día (turno partido) no generan horas en el hueco', async () => {
      const d = nextDateWithWeekday(2);
      fake.config = baseConfig({ deliveryDays: [fmt(d)] });
      fake.config.dailySlots['2'] = [{ start: '09:00', end: '10:00' }, { start: '16:00', end: '17:30' }];
      expect(await allTimes(fmt(d))).toEqual(['09:00', '09:30', '16:00', '16:30', '17:00']);
    });

    it('un tramo de una sola franja (30 min) ofrece exactamente una hora', async () => {
      const d = nextDateWithWeekday(4);
      fake.config = baseConfig({ deliveryDays: [fmt(d)] });
      fake.config.dailySlots['4'] = [{ start: '12:00', end: '12:30' }];
      expect(await allTimes(fmt(d))).toEqual(['12:00']);
    });

    it('tramo con inicio >= fin (config corrupta) no ofrece horas ni marca el día como disponible', async () => {
      const d = nextDateWithWeekday(2);
      fake.config = baseConfig({ deliveryDays: [fmt(d)] });
      fake.config.dailySlots['2'] = [{ start: '13:00', end: '09:00' }];
      expect(await allTimes(fmt(d))).toEqual([]);
      expect((await monthOf(d))[fmt(d)].available).toBeFalse();
    });
  });

  describe('Bloqueo por reservas existentes (blockingRules)', () => {
    let d: Date; let ds: string;
    beforeEach(() => {
      d = nextDateWithWeekday(3); ds = fmt(d);
      fake.config = baseConfig({ deliveryDays: [ds] });
    });

    it('regla near 60/30: una reserva a las 10:30 bloquea 09:30–11:00', async () => {
      fake.orders = [order(ds, '10:30')];
      const slots = await service.getAvailableSlots(ds);
      const blocked = slots.filter(s => !s.available).map(s => s.time);
      expect(blocked).toEqual(['09:30', '10:00', '10:30', '11:00']);
      expect(slots.filter(s => s.available).map(s => s.time)).toEqual(['09:00', '11:30', '12:00', '12:30']);
    });

    it('regla 0/0: solo se bloquea la hora reservada', async () => {
      fake.config.blockingRules.near = { beforeMinutes: 0, afterMinutes: 0 };
      fake.orders = [order(ds, '10:30')];
      const blocked = (await service.getAvailableSlots(ds)).filter(s => !s.available).map(s => s.time);
      expect(blocked).toEqual(['10:30']);
    });

    it('regla que no es múltiplo de 30 (45/45) redondea hacia dentro sin bloquear de más', async () => {
      fake.config.blockingRules.near = { beforeMinutes: 45, afterMinutes: 45 };
      fake.orders = [order(ds, '10:30')];
      const blocked = (await service.getAvailableSlots(ds)).filter(s => !s.available).map(s => s.time);
      expect(blocked).toEqual(['10:00', '10:30', '11:00']);
    });

    it('dos reservas bloquean la unión de sus zonas', async () => {
      fake.orders = [order(ds, '09:00'), order(ds, '12:00')];
      const blocked = (await service.getAvailableSlots(ds)).filter(s => !s.available).map(s => s.time);
      expect(blocked).toEqual(['09:00', '09:30', '11:00', '11:30', '12:00', '12:30']);
    });

    it('los pedidos cancelados NO bloquean; pendientes y pagados SÍ', async () => {
      fake.config.blockingRules.near = { beforeMinutes: 0, afterMinutes: 0 };
      fake.orders = [order(ds, '09:00', { status: 'cancelled' }), order(ds, '10:00', { status: 'pending' }), order(ds, '11:00', { status: 'paid' })];
      const blocked = (await service.getAvailableSlots(ds)).filter(s => !s.available).map(s => s.time);
      expect(blocked).toEqual(['10:00', '11:00']);
    });

    it('un día parcialmente bloqueado sigue apareciendo disponible en el calendario', async () => {
      fake.orders = [order(ds, '10:30')];
      expect((await monthOf(d))[ds].available).toBeTrue();
    });

    it('un día con todas las horas bloqueadas aparece NO disponible en el calendario y sin horas libres', async () => {
      fake.config.dailySlots['3'] = [{ start: '09:00', end: '10:00' }]; // 09:00 y 09:30
      fake.orders = [order(ds, '09:00')]; // after 30 → bloquea 09:30 también
      expect((await monthOf(d))[ds]).toEqual({ available: false, reason: 'Todas las horas bloqueadas' });
      expect(await freeTimes(ds)).toEqual([]);
    });

    it('calendario y desplegable coinciden para todo el mes con varias reservas', async () => {
      const days = [nextDateWithWeekday(1), nextDateWithWeekday(2), nextDateWithWeekday(3)].map(fmt);
      fake.config = baseConfig({ deliveryDays: days });
      fake.config.dailySlots = { '0': [], '1': [{ start: '09:00', end: '10:00' }], '2': [{ start: '09:00', end: '11:00' }], '3': [{ start: '09:00', end: '13:00' }], '4': [], '5': [], '6': [] };
      fake.orders = [order(days[0], '09:00'), order(days[1], '09:30'), order(days[2], '11:00')];
      const dt = new Date(days[0]);
      await expectCalendarAndSlotsAgree(dt.getFullYear(), dt.getMonth());
    });
  });

  describe('Visibilidad de las reservas según quién consulta (endpoint público de ocupación)', () => {
    let ds: string;
    beforeEach(() => {
      ds = fmt(nextDateWithWeekday(3));
      fake.config = baseConfig({ deliveryDays: [ds] });
      fake.orders = [order(ds, '10:30', { customer_uid: 'someone-else' })];
    });

    it('un cliente identificado debe ver bloqueada la hora reservada por OTRO cliente', async () => {
      fake.loginAs('customer');
      const blocked = (await service.getAvailableSlots(ds)).filter(s => !s.available).map(s => s.time);
      expect(blocked).toContain('10:30');
    });

    it('un invitado (sin sesión) debe ver bloqueada la hora reservada por otro cliente', async () => {
      fake.loginAs('guest');
      const blocked = (await service.getAvailableSlots(ds)).filter(s => !s.available).map(s => s.time);
      expect(blocked).toContain('10:30');
    });

    it('el calendario de un invitado debe marcar el día completo como no disponible si todas sus horas están reservadas', async () => {
      fake.config.dailySlots['3'] = [{ start: '09:00', end: '09:30' }];
      fake.orders = [order(ds, '09:00', { customer_uid: 'someone-else' })];
      fake.loginAs('guest');
      const d = new Date(ds + 'T12:00:00');
      expect((await monthOf(d))[ds].available).toBeFalse();
    });
  });

  describe('Filtro por fecha de las reservas', () => {
    it('una reserva de OTRO día no debe bloquear horas del día consultado', async () => {
      const a = nextDateWithWeekday(2); const b = nextDateWithWeekday(3);
      fake.config = baseConfig({ deliveryDays: [fmt(a), fmt(b)] });
      fake.orders = [order(fmt(a), '10:30')];
      // El día b no tiene ninguna reserva: debe tener las 8 horas libres.
      expect((await freeTimes(fmt(b))).length).toBe(8);
    });
  });

  describe('Proximidad de la reserva (near / medium / far)', () => {
    it('una reserva "far" (calculada por Google Maps al pedirla) bloquea según la regla far (120/90) y no según near (60/30)', async () => {
      const d = nextDateWithWeekday(3); const ds = fmt(d);
      fake.config = baseConfig({ deliveryDays: [ds] });
      fake.orders = [order(ds, '11:00', { delivery_proximity: 'far' })];
      const blocked = (await service.getAvailableSlots(ds)).filter(s => !s.available).map(s => s.time);
      // far: 4 franjas antes (09:00..10:30), 3 después (11:30..12:30)
      expect(blocked).toEqual(['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '12:30']);
    });
  });

  describe('Carga de configuración', () => {
    it('una configuración antigua sin proximityThresholds/deliverySurcharges se completa con valores por defecto', async () => {
      const legacy: any = { deliveryDays: ['2099-01-05'], dailySlots: { '1': [{ start: '09:00', end: '10:00' }] }, blockingRules: baseConfig().blockingRules };
      fake.config = legacy;
      const cfg: AppointmentConfig = await service.getConfig();
      expect(cfg.proximityThresholds).toEqual({ nearMaxMinutes: 15, mediumMaxMinutes: 30 });
      expect(cfg.deliverySurcharges.medium).toEqual({ type: 'fixed', amount: 0 });
      expect(cfg.maxDeliveryMinutes).toBe(60);
    });

    it('guardar y volver a cargar devuelve exactamente la misma configuración', async () => {
      const cfg = baseConfig({ deliveryDays: ['2099-03-01', '2099-03-02'], originAddress: 'Calle Falsa 1' });
      await service.saveConfig(cfg);
      expect(fake.postedConfigs.length).toBe(1);
      const loaded = await service.getConfig();
      expect(loaded.deliveryDays).toEqual(cfg.deliveryDays);
      expect(loaded.dailySlots).toEqual(cfg.dailySlots);
      expect(loaded.blockingRules).toEqual(cfg.blockingRules);
      expect(loaded.originAddress).toBe('Calle Falsa 1');
    });
  });

  describe('Hoy y hora actual', () => {
    it('no existe antelación mínima; hoy se ofrecen horas que ya han pasado', async () => {
      const today = new Date();
      const dailySlots: any = {};
      for (let i = 0; i < 7; i++) dailySlots[String(i)] = [{ start: '00:00', end: '23:30' }];
      fake.config = baseConfig({ deliveryDays: [fmt(today)], dailySlots });
      const nowMin = today.getHours() * 60 + today.getMinutes();
      const pastFree = (await service.getAvailableSlots(fmt(today))).filter(s => {
        const [h, m] = s.time.split(':').map(Number);
        return s.available && h * 60 + m < nowMin;
      });
      // Una entrega en el pasado no tiene sentido comercial: se espera que no se ofrezca.
      expect(pastFree.length).withContext('horas pasadas ofrecidas hoy: ' + pastFree.map(s => s.time).join(',')).toBe(0);
    });
  });
});
