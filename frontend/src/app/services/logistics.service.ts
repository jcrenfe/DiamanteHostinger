import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

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
    private readonly API_URL = `${environment.apiUrl}/logistics`;

    private getHeaders() {
        const token = localStorage.getItem('token');
        return new HttpHeaders({ 'Authorization': `Bearer ${token}` });
    }

    async optimizeRoutes(request: OptimizationRequest) {
        const response = await firstValueFrom(this.http.post<any>(`${this.API_URL}/optimize`, request, { headers: this.getHeaders() }));
        return response;
    }
}
