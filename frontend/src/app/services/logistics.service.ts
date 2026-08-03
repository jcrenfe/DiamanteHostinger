import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { functions } from '../app.firebase';
import { httpsCallable } from 'firebase/functions';

export interface OptimizationRequest {
    orders: any[];
    drivers: number;
    marginMinutes: number;
    optimizeFor: 'time' | 'distance';
}

@Injectable({
    providedIn: 'root'
})
export class LogisticsService {
    private http = inject(HttpClient);

    async optimizeRoutes(request: OptimizationRequest) {
        // Uso de HTTPS Callable de Firebase para optimización de rutas
        const optimizeFn = httpsCallable(functions, 'optimizeLogistics');
        const response = await optimizeFn(request);
        return response.data;
    }
}
