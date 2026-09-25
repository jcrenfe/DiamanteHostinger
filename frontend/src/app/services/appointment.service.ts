import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

export interface TimeSlot {
    time: string; // "08:00", "08:30", etc.
    available: boolean;
    reason?: string;
}

export interface DayConfig {
    date: string; // ISO Date YYYY-MM-DD
    active: boolean;
}

export interface TimeRange {
    start: string; // "09:00"
    end: string;   // "13:30"
}

export interface DailySlots {
    [key: string]: TimeRange[]; // key: "1" (Monday) to "7" (Sunday)
}

export interface ProximityBlock {
    beforeMinutes: number;
    afterMinutes: number;
}

export interface ProximityConfig {
    [key: string]: ProximityBlock;
    near: ProximityBlock;
    medium: ProximityBlock;
    far: ProximityBlock;
}

export interface ProximityThresholds {
    // Tiempo de trayecto (minutos) desde originAddress, calculado con la Routes API de Google.
    // near:   0 .. nearMaxMinutes
    // medium: nearMaxMinutes .. mediumMaxMinutes
    // far:    > mediumMaxMinutes
    nearMaxMinutes: number;
    mediumMaxMinutes: number;
}

export interface DeliverySurchargeRule {
    type: 'fixed' | 'perKm';
    amount: number;
}

export interface DeliverySurcharges {
    // "Cerca" no lleva incremento. Solo Media y Lejos.
    [key: string]: DeliverySurchargeRule;
    medium: DeliverySurchargeRule;
    far: DeliverySurchargeRule;
}

export interface AppointmentConfig {
    deliveryDays: string[];
    dailySlots: DailySlots;
    blockingRules: ProximityConfig;
    originAddress: string;
    proximityThresholds: ProximityThresholds;
    // Radio máximo de reparto: por encima de este tiempo de trayecto (min) desde
    // originAddress, no se admiten pedidos.
    maxDeliveryMinutes: number;
    deliverySurcharges: DeliverySurcharges;
}

@Injectable({
    providedIn: 'root'
})
export class AppointmentService {
    private http = inject(HttpClient);
    private readonly API_URL = environment.apiUrl;

    private defaultConfig: AppointmentConfig = {
        deliveryDays: [], 
        dailySlots: {
            "1": [{ start: "09:00", end: "13:00" }], 
            "2": [{ start: "09:00", end: "13:00" }],
            "3": [{ start: "09:00", end: "13:00" }],
            "4": [{ start: "09:00", end: "13:00" }],
            "5": [{ start: "09:00", end: "13:00" }],
            "6": [], 
            "0": []  
        },
        blockingRules: {
            near: { beforeMinutes: 60, afterMinutes: 30 },
            medium: { beforeMinutes: 90, afterMinutes: 60 },
            far: { beforeMinutes: 120, afterMinutes: 90 }
        },
        originAddress: '',
        proximityThresholds: {
            nearMaxMinutes: 15,
            mediumMaxMinutes: 30
        },
        maxDeliveryMinutes: 60,
        deliverySurcharges: {
            medium: { type: 'fixed', amount: 0 },
            far: { type: 'fixed', amount: 0 }
        }
    };

    private getHeaders() {
        const token = localStorage.getItem('token');
        return new HttpHeaders({ 'Authorization': `Bearer ${token}` });
    }

    /** Reservas ocupadas (endpoint público, sin datos personales) entre dos fechas. */
    private async getOccupancy(query: string): Promise<{ date: string; timeSlot: string; proximity: 'near' | 'medium' | 'far' | null }[]> {
        try {
            return await firstValueFrom(this.http.get<any[]>(`${this.API_URL}/orders/occupancy?${query}`));
        } catch (e) {
            console.error(e);
            return [];
        }
    }

    /** Minutos bloqueados por cada reserva según SU proximidad (calculada con Google Maps al hacer el pedido). */
    private blockedByDate(occupancy: { date: string; timeSlot: string; proximity: string | null }[], config: AppointmentConfig): Map<string, Set<number>> {
        const byDate = new Map<string, Set<number>>();
        occupancy.forEach(o => {
            if (!o.date || !o.timeSlot) return;
            const set = byDate.get(o.date) || new Set<number>();
            byDate.set(o.date, set);
            const center = this.timeToMinutes(o.timeSlot);
            const rule = config.blockingRules[o.proximity || 'near'] || config.blockingRules['near'];
            set.add(center);
            if (rule) {
                for (let m = center - 30; m >= center - rule.beforeMinutes; m -= 30) set.add(m);
                for (let m = center + 30; m <= center + rule.afterMinutes; m += 30) set.add(m);
            }
        });
        return byDate;
    }

    /** Horas configuradas para la fecha; si es hoy, descarta las que ya han pasado. */
    private configuredSlots(config: AppointmentConfig, dateStr: string): number[] {
        if (!config.deliveryDays || !config.deliveryDays.includes(dateStr)) return [];
        const [y, m, d] = dateStr.split('-').map(Number);
        const ranges = config.dailySlots[new Date(y, m - 1, d).getDay().toString()] || [];
        const slots: number[] = [];
        ranges.forEach(range => {
            for (let c = this.timeToMinutes(range.start); c < this.timeToMinutes(range.end); c += 30) slots.push(c);
        });
        const now = new Date();
        const todayStr = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}`;
        if (dateStr === todayStr) {
            const nowMin = now.getHours() * 60 + now.getMinutes();
            return slots.filter(c => c > nowMin);
        }
        return slots;
    }

    async getAvailableSlots(dateStr: string): Promise<TimeSlot[]> {
        const config = await this.getConfig();
        const slots = this.configuredSlots(config, dateStr);
        if (slots.length === 0) return [];

        const occupancy = (await this.getOccupancy(`date=${dateStr}`)).filter(o => o.date === dateStr);
        const blocked = this.blockedByDate(occupancy, config).get(dateStr) || new Set<number>();
        return slots.map(m => ({ time: this.minutesToTime(m), available: !blocked.has(m) }));
    }

    async getMonthAvailability(year: number, month: number): Promise<Record<string, { available: boolean, reason?: string }>> {
        const config = await this.getConfig();
        const result: Record<string, { available: boolean, reason?: string }> = {};

        const pad = (n: number) => n.toString().padStart(2, '0');
        const monthNum = month + 1;
        const lastDay = new Date(year, monthNum, 0).getDate();
        const occupancy = await this.getOccupancy(`start=${year}-${pad(monthNum)}-01&end=${year}-${pad(monthNum)}-${pad(lastDay)}`);
        const blockedByDate = this.blockedByDate(occupancy, config);

        const now = new Date();
        const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

        for (let day = 1; day <= lastDay; day++) {
            const dateStr = `${year}-${pad(monthNum)}-${pad(day)}`;

            if (dateStr < todayStr) {
                result[dateStr] = { available: false, reason: 'Día pasado' };
                continue;
            }
            if (!config.deliveryDays || !config.deliveryDays.includes(dateStr)) {
                result[dateStr] = { available: false, reason: 'No disponible para reparto' };
                continue;
            }
            const weekday = new Date(year, month, day).getDay().toString();
            if ((config.dailySlots[weekday] || []).length === 0) {
                result[dateStr] = { available: false, reason: 'Sin horario configurado' };
                continue;
            }
            const possible = this.configuredSlots(config, dateStr);
            if (possible.length === 0) {
                result[dateStr] = { available: false, reason: dateStr === todayStr ? 'Sin horas libres hoy' : 'Sin tramos posibles' };
                continue;
            }
            const blocked = blockedByDate.get(dateStr) || new Set<number>();
            result[dateStr] = possible.some(m => !blocked.has(m))
                ? { available: true }
                : { available: false, reason: 'Todas las horas bloqueadas' };
        }

        return result;
    }

    private timeToMinutes(time: string): number {
        const [h, m] = time.split(':').map(Number);
        return h * 60 + m;
    }

    private minutesToTime(totalMin: number): string {
        const h = Math.floor(totalMin / 60);
        const m = totalMin % 60;
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    }

    async getConfig(): Promise<AppointmentConfig> {
        try {
            const config = await firstValueFrom(this.http.get<AppointmentConfig>(`${this.API_URL}/config/appointment`, { headers: this.getHeaders() }));
            if (!config) return this.defaultConfig;
            // Fusiona con los valores por defecto para no romper configuraciones guardadas
            // antes de añadir originAddress/proximityThresholds.
            return {
                ...this.defaultConfig,
                ...config,
                proximityThresholds: {
                    ...this.defaultConfig.proximityThresholds,
                    ...(config.proximityThresholds || {})
                },
                deliverySurcharges: {
                    medium: { ...this.defaultConfig.deliverySurcharges.medium, ...(config.deliverySurcharges?.medium || {}) },
                    far: { ...this.defaultConfig.deliverySurcharges.far, ...(config.deliverySurcharges?.far || {}) }
                }
            };
        } catch(e) {
            return this.defaultConfig;
        }
    }

    async saveConfig(config: AppointmentConfig) {
        await firstValueFrom(this.http.post(`${this.API_URL}/config/appointment`, config, { headers: this.getHeaders() }));
    }
}
