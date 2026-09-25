import { HttpErrorResponse, HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { AppointmentConfig } from '../services/appointment.service';

/**
 * Backend en memoria que replica el comportamiento REAL de las rutas
 * backend/src/routes/config.js y backend/src/routes/orders.js:
 *  - GET /orders/occupancy es pública y solo expone {date,timeSlot,proximity} de pedidos no cancelados.
 *  - GET /orders exige token, (admite ?date/?start/?end) y, si el usuario no es admin,
 *    devuelve solo sus propios pedidos (en formato plano de Prisma: delivery_date, delivery_timeSlot...).
 *  - GET/POST /config/appointment guardan el JSON tal cual.
 */
export interface FakeOrder {
  id: string;
  status: string;
  customer_uid?: string;
  delivery_date: string;
  delivery_timeSlot: string;
  delivery_proximity?: 'near' | 'medium' | 'far' | null;
  total?: number;
  createdAt?: string;
  items?: { name: string; quantity: number; price: number; productId?: string }[];
}

export const fake = {
  config: null as any,
  orders: [] as FakeOrder[],
  saveStatus: 200,
  postedConfigs: [] as any[],
  ordersRequests: [] as string[],
  reset() {
    this.config = null;
    this.orders = [];
    this.saveStatus = 200;
    this.postedConfigs = [];
    this.ordersRequests = [];
    localStorage.removeItem('token');
    localStorage.removeItem('fakeRole');
  },
  loginAs(role: 'admin' | 'customer' | 'guest') {
    if (role === 'guest') {
      localStorage.removeItem('token');
    } else {
      localStorage.setItem('token', role);
    }
    localStorage.setItem('fakeRole', role);
  }
};

export const fakeBackendInterceptor: HttpInterceptorFn = (req, next) => {
  const url = req.url;

  if (url.endsWith('/config/appointment')) {
    if (req.method === 'GET') {
      return fake.config
        ? of(new HttpResponse({ status: 200, body: JSON.parse(JSON.stringify(fake.config)) }))
        : throwError(() => new HttpErrorResponse({ status: 404, url }));
    }
    if (req.method === 'POST') {
      if (fake.saveStatus !== 200) {
        return throwError(() => new HttpErrorResponse({ status: fake.saveStatus, url }));
      }
      fake.config = JSON.parse(JSON.stringify(req.body));
      fake.postedConfigs.push(fake.config);
      return of(new HttpResponse({ status: 200, body: { success: true, config: fake.config } }));
    }
  }

  if (url.includes('/orders/occupancy') && req.method === 'GET') {
    // Réplica de GET /orders/occupancy: pública, sin datos personales, sin cancelados, con filtro de fechas.
    const params = new URL(url).searchParams;
    const [date, start, end] = [params.get('date'), params.get('start'), params.get('end')];
    const body = fake.orders
      .filter(o => o.status !== 'cancelled')
      .filter(o => (!date || o.delivery_date === date) && (!start || o.delivery_date >= start) && (!end || o.delivery_date <= end))
      .map(o => ({ date: o.delivery_date, timeSlot: o.delivery_timeSlot, proximity: o.delivery_proximity || null }));
    return of(new HttpResponse({ status: 200, body }));
  }

  if (url.includes('/orders') && req.method === 'GET') {
    fake.ordersRequests.push(url);
    const auth = req.headers.get('Authorization') || '';
    const token = auth.replace('Bearer ', '');
    if (!token || token === 'null') {
      return throwError(() => new HttpErrorResponse({ status: 401, url }));
    }
    // GET /orders?mine=1 devuelve solo los pedidos del propio usuario, incluso siendo admin
    const mine = new URL(url).searchParams.get('mine') === '1';
    const all = token === 'admin' && !mine ? fake.orders : fake.orders.filter(o => o.customer_uid === 'me');
    const body = all.map(o => ({ ...o, items: o.items || [] }));
    return of(new HttpResponse({ status: 200, body: JSON.parse(JSON.stringify(body)) }));
  }

  return throwError(() => new HttpErrorResponse({ status: 404, url }));
};

// ---------- utilidades de fechas / configuración ----------

export const pad = (n: number) => n.toString().padStart(2, '0');
export const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** Próxima fecha (>= hoy + minDays) cuyo día de la semana JS (0=Dom..6=Sáb) sea `weekday`. */
export function nextDateWithWeekday(weekday: number, minDays = 3): Date {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + minDays);
  while (d.getDay() !== weekday) d.setDate(d.getDate() + 1);
  return d;
}

export function baseConfig(overrides: Partial<AppointmentConfig> = {}): AppointmentConfig {
  return {
    deliveryDays: [],
    dailySlots: {
      '0': [], '1': [{ start: '09:00', end: '13:00' }], '2': [{ start: '09:00', end: '13:00' }],
      '3': [{ start: '09:00', end: '13:00' }], '4': [{ start: '09:00', end: '13:00' }],
      '5': [{ start: '09:00', end: '13:00' }], '6': []
    },
    blockingRules: {
      near: { beforeMinutes: 60, afterMinutes: 30 },
      medium: { beforeMinutes: 90, afterMinutes: 60 },
      far: { beforeMinutes: 120, afterMinutes: 90 }
    },
    originAddress: '',
    proximityThresholds: { nearMaxMinutes: 15, mediumMaxMinutes: 30 },
    maxDeliveryMinutes: 60,
    deliverySurcharges: { medium: { type: 'fixed', amount: 0 }, far: { type: 'fixed', amount: 0 } },
    ...overrides
  };
}

/** Deja que se resuelvan promesas/microtareas/timeouts pendientes y refresca la vista. */
export async function settle(fixture: { whenStable(): Promise<any>; detectChanges(): void }, rounds = 4) {
  for (let i = 0; i < rounds; i++) {
    await fixture.whenStable();
    await new Promise(r => setTimeout(r, 0));
    fixture.detectChanges();
  }
}
