import { Injectable, inject } from '@angular/core';
import { db } from '../app.firebase';
import { collection, getDocs, query, where, doc, getDoc, setDoc } from 'firebase/firestore';

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
    near: ProximityBlock;   // Proximidad: Cercana
    medium: ProximityBlock; // Proximidad: Media
    far: ProximityBlock;    // Proximidad: Lejana
}

export interface AppointmentConfig {
    deliveryDays: string[]; // List of specific dates (YYYY-MM-DD) that ARE delivery days
    dailySlots: DailySlots; // Slots per weekday
    blockingRules: ProximityConfig;
}

@Injectable({
    providedIn: 'root'
})
export class AppointmentService {

    private defaultConfig: AppointmentConfig = {
        deliveryDays: [], // Empty means use standard logic or special manual choice
        dailySlots: {
            "1": [{ start: "09:00", end: "13:00" }], // Example: Monday
            "2": [{ start: "09:00", end: "13:00" }],
            "3": [{ start: "09:00", end: "13:00" }],
            "4": [{ start: "09:00", end: "13:00" }],
            "5": [{ start: "09:00", end: "13:00" }],
            "6": [], // Saturday
            "0": []  // Sunday (JS getDay: 0 is Sunday, 1 is Monday)
        },
        blockingRules: {
            near: { beforeMinutes: 60, afterMinutes: 30 },
            medium: { beforeMinutes: 90, afterMinutes: 60 },
            far: { beforeMinutes: 120, afterMinutes: 90 }
        }
    };

    /**
     * Logic:
     * 1. Only days in 'deliveryDays' are available.
     * 2. Hours depend on 'dailySlots' for that weekday.
     * 3. Already booked orders + their proximity blocks remove slots.
     */
    async getAvailableSlots(dateStr: string, proximity: 'near' | 'medium' | 'far' = 'near'): Promise<TimeSlot[]> {
        const config = await this.getConfig();
        const [y, m, d] = dateStr.split('-').map(Number);
        const date = new Date(y, m - 1, d);
        const weekday = date.getDay().toString(); // 0 is Sunday
        
        // 1. Check if day is a delivery day
        if (!config.deliveryDays.includes(dateStr)) {
            return [];
        }

        // 2. Generate slots based on dailySlots for this day
        const ranges = config.dailySlots[weekday] || [];
        if (ranges.length === 0) return [];

        let allPossibleSlots: string[] = [];
        ranges.forEach(range => {
            let current = this.timeToMinutes(range.start);
            const end = this.timeToMinutes(range.end);
            while (current < end) {
                allPossibleSlots.push(this.minutesToTime(current));
                current += 30; // Blocks of 30 minutes
            }
        });

        // 3. Get existing appointments and apply blocks
        const ordersCol = collection(db, 'pedidos');
        const q = query(ordersCol, where('delivery.date', '==', dateStr));
        const snapshot = await getDocs(q);

        const blockedMinutes = new Set<number>();
        
        snapshot.forEach(doc => {
            const data = doc.data();
            if (data['status'] === 'cancelled') return;
            const delivery = data['delivery'];
            if (delivery && (delivery.timeSlot || delivery.time)) {
                const timeStr = delivery.timeSlot || delivery.time;
                const centerMin = this.timeToMinutes(timeStr);
                
                // Block the center slot
                blockedMinutes.add(centerMin);

                // Apply proximity rules (for now all Near as requested)
                const rule = config.blockingRules[proximity];
                
                if (rule) {
                    // Block BEFORE
                    for (let m = centerMin - 30; m >= centerMin - rule.beforeMinutes; m -= 30) {
                        blockedMinutes.add(m);
                    }
                    // Block AFTER
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

    /**
     * Obtiene la disponibilidad (disponible o no) de cada día del mes indicado.
     */
    async getMonthAvailability(
        year: number,
        month: number, // 0-indexed (0 = Enero, 11 = Diciembre)
        proximity: 'near' | 'medium' | 'far' = 'near'
    ): Promise<Record<string, { available: boolean, reason?: string }>> {
        const config = await this.getConfig();
        const result: Record<string, { available: boolean, reason?: string }> = {};

        const pad = (n: number) => n.toString().padStart(2, '0');
        const monthNum = month + 1;
        const startDateStr = `${year}-${pad(monthNum)}-01`;
        const lastDay = new Date(year, monthNum, 0).getDate();
        const endDateStr = `${year}-${pad(monthNum)}-${pad(lastDay)}`;

        // Consultar todos los pedidos del mes
        const ordersCol = collection(db, 'pedidos');
        const q = query(
            ordersCol,
            where('delivery.date', '>=', startDateStr),
            where('delivery.date', '<=', endDateStr)
        );

        const dateBlockedMinutes = new Map<string, Set<number>>();
        try {
            const snapshot = await getDocs(q);
            snapshot.forEach(docSnap => {
                const data = docSnap.data();
                if (data['status'] === 'cancelled') return;
                const delivery = data['delivery'];
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
        } catch (err) {
        }

        // Fecha actual en ISO local YYYY-MM-DD
        const now = new Date();
        const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

        for (let day = 1; day <= lastDay; day++) {
            const dateStr = `${year}-${pad(monthNum)}-${pad(day)}`;

            // 1. Fecha pasada
            if (dateStr < todayStr) {
                result[dateStr] = { available: false, reason: 'Día pasado' };
                continue;
            }

            // 2. Comprobar si está en deliveryDays
            if (!config.deliveryDays || !config.deliveryDays.includes(dateStr)) {
                result[dateStr] = { available: false, reason: 'No disponible para reparto' };
                continue;
            }

            // 3. Comprobar slots por día de la semana
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
        const docRef = doc(db, 'configuracion', 'disponibilidad');
        const snap = await getDoc(docRef);
        if (snap.exists()) {
            return snap.data() as AppointmentConfig;
        }
        return this.defaultConfig;
    }

    async saveConfig(config: AppointmentConfig) {
        await setDoc(doc(db, 'configuracion', 'disponibilidad'), config);
    }
}
