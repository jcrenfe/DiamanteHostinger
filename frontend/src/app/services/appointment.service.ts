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

export interface AppointmentConfig {
    deliveryDays: string[]; 
    dailySlots: DailySlots; 
    blockingRules: ProximityConfig;
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
        }
    };

    private getHeaders() {
        const token = localStorage.getItem('token');
        return new HttpHeaders({ 'Authorization': `Bearer ${token}` });
    }

    async getAvailableSlots(dateStr: string, proximity: 'near' | 'medium' | 'far' = 'near'): Promise<TimeSlot[]> {
        const config = await this.getConfig();
        const [y, m, d] = dateStr.split('-').map(Number);
        const date = new Date(y, m - 1, d);
        const weekday = date.getDay().toString();
        
        if (!config.deliveryDays.includes(dateStr)) {
            return [];
        }

        const ranges = config.dailySlots[weekday] || [];
        if (ranges.length === 0) return [];

        let allPossibleSlots: string[] = [];
        ranges.forEach(range => {
            let current = this.timeToMinutes(range.start);
            const end = this.timeToMinutes(range.end);
            while (current < end) {
                allPossibleSlots.push(this.minutesToTime(current));
                current += 30; 
            }
        });

        // Get existing appointments
        let orders: any[] = [];
        try {
            orders = await firstValueFrom(this.http.get<any[]>(`${this.API_URL}/orders?date=${dateStr}`, { headers: this.getHeaders() }));
        } catch(e) {
            console.error(e);
        }

        const blockedMinutes = new Set<number>();
        
        orders.forEach(data => {
            if (data.status === 'cancelled') return;
            const delivery = data.delivery || { timeSlot: data.delivery_timeSlot, time: data.delivery_timeSlot };
            if (delivery && (delivery.timeSlot || delivery.time)) {
                const timeStr = delivery.timeSlot || delivery.time;
                const centerMin = this.timeToMinutes(timeStr);
                
                blockedMinutes.add(centerMin);

                const rule = config.blockingRules[proximity];
                if (rule) {
                    for (let m = centerMin - 30; m >= centerMin - rule.beforeMinutes; m -= 30) {
                        blockedMinutes.add(m);
                    }
                    for (let m = centerMin + 30; m <= centerMin + rule.afterMinutes; m += 30) {
                        blockedMinutes.add(m);
                    }
                }
            }
        });

        return allPossibleSlots.map(time => ({
            time,
            available: !blockedMinutes.has(this.timeToMinutes(time))
        }));
    }

    async getMonthAvailability(
        year: number,
        month: number, 
        proximity: 'near' | 'medium' | 'far' = 'near'
    ): Promise<Record<string, { available: boolean, reason?: string }>> {
        const config = await this.getConfig();
        const result: Record<string, { available: boolean, reason?: string }> = {};

        const pad = (n: number) => n.toString().padStart(2, '0');
        const monthNum = month + 1;
        const startDateStr = `${year}-${pad(monthNum)}-01`;
        const lastDay = new Date(year, monthNum, 0).getDate();
        const endDateStr = `${year}-${pad(monthNum)}-${pad(lastDay)}`;

        let orders: any[] = [];
        try {
            // Get all orders for this month (we can do filtering in backend or fetch all and filter in frontend)
            orders = await firstValueFrom(this.http.get<any[]>(`${this.API_URL}/orders?start=${startDateStr}&end=${endDateStr}`, { headers: this.getHeaders() }));
        } catch(e) {
            console.error(e);
        }

        const dateBlockedMinutes = new Map<string, Set<number>>();
        orders.forEach(data => {
            if (data.status === 'cancelled') return;
            const delivery = data.delivery || { date: data.delivery_date, timeSlot: data.delivery_timeSlot };
            if (delivery && delivery.date) {
                const timeStr = delivery.timeSlot || delivery.time;
                if (timeStr) {
                    const dateStr = delivery.date;
                    const centerMin = this.timeToMinutes(timeStr);

                    if (!dateBlockedMinutes.has(dateStr)) {
                        dateBlockedMinutes.set(dateStr, new Set<number>());
                    }
                    const blockedSet = dateBlockedMinutes.get(dateStr)!;
                    blockedSet.add(centerMin);

                    const rule = config.blockingRules[proximity] || config.blockingRules['near'];
                    if (rule) {
                        for (let m = centerMin - 30; m >= centerMin - rule.beforeMinutes; m -= 30) {
                            blockedSet.add(m);
                        }
                        for (let m = centerMin + 30; m <= centerMin + rule.afterMinutes; m += 30) {
                            blockedSet.add(m);
                        }
                    }
                }
            }
        });

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

            const dateObj = new Date(year, month, day);
            const weekday = dateObj.getDay().toString();
            const ranges = config.dailySlots[weekday] || [];

            if (ranges.length === 0) {
                result[dateStr] = { available: false, reason: 'Sin horario configurado' };
                continue;
            }

            const possibleSlots: number[] = [];
            ranges.forEach(range => {
                let current = this.timeToMinutes(range.start);
                const end = this.timeToMinutes(range.end);
                while (current < end) {
                    possibleSlots.push(current);
                    current += 30;
                }
            });

            if (possibleSlots.length === 0) {
                result[dateStr] = { available: false, reason: 'Sin tramos posibles' };
                continue;
            }

            const blockedSet = dateBlockedMinutes.get(dateStr) || new Set<number>();
            const freeSlotsCount = possibleSlots.filter(m => !blockedSet.has(m)).length;

            if (freeSlotsCount > 0) {
                result[dateStr] = { available: true };
            } else {
                result[dateStr] = { available: false, reason: 'Todas las horas bloqueadas' };
            }
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
            return config || this.defaultConfig;
        } catch(e) {
            return this.defaultConfig;
        }
    }

    async saveConfig(config: AppointmentConfig) {
        try {
            await firstValueFrom(this.http.post(`${this.API_URL}/config/appointment`, config, { headers: this.getHeaders() }));
        } catch(e) {
            console.error("Error saving config", e);
        }
    }
}
