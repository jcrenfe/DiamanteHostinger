import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

export interface OptimizationRequest {
    date: string;
    orderIds: string[];
    /** Minutos que se tarda en cada entrega (aparcar, subir, entregar) */
    marginMinutes: number;
}

export interface RouteStop {
    id: string;
    customer_name: string;
    customer_phone: string;
    address: string;
    addressExtra: string | null;
    status: string;
    timeSlot: string;
    eta: string;
    waitMin: number;
    lateMin: number;
    legMinutes: number;
    legKm: number;
}

export interface RoutePlan {
    success: boolean;
    origin: string;
    departure: string;
    end: string;
    totalDrivingMinutes: number;
    totalDistanceKm: number;
    stops: RouteStop[];
    warnings: { id: string; message: string }[];
}

@Injectable({
    providedIn: 'root'
})
export class LogisticsService {
    private http = inject(HttpClient);
    private readonly API_URL = `${environment.apiUrl}/logistics`;

    private getHeaders() {
        const token = localStorage.getItem('token');
        return new HttpHeaders({ 'Authorization': `Bearer ${token}` });
    }

    async optimizeRoutes(request: OptimizationRequest): Promise<RoutePlan> {
        const response = await firstValueFrom(this.http.post<RoutePlan>(`${this.API_URL}/optimize`, request, { headers: this.getHeaders() }));
        return response;
    }
}
