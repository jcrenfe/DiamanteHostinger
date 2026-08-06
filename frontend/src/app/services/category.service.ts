import { Injectable, signal, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Category {
    id?: string;
    name: string;
    isDefault?: boolean; 
    order?: number;
}

@Injectable({
    providedIn: 'root'
})
export class CategoryService {
    private http = inject(HttpClient);
    private readonly API_URL = `${environment.apiUrl}/categories`;

    private categoriesSignal = signal<Category[]>([]);
    categories = this.categoriesSignal.asReadonly();

    private getHeaders() {
        const token = localStorage.getItem('token');
        return new HttpHeaders({ 'Authorization': `Bearer ${token}` });
    }

    async loadCategories(): Promise<void> {
        try {
            const list = await firstValueFrom(this.http.get<Category[]>(this.API_URL));
            
            if (!list || list.length === 0) {
                // If backend has no categories, we don't try to seed them from public page to avoid 401
                this.categoriesSignal.set([]);
                return;
            }

            this.categoriesSignal.set(list.sort((a, b) => (a.order || 0) - (b.order || 0)));
        } catch (err) {
            console.error(err);
        }
    }

    private async seedInitialCategories() {
        const initialNames = ["Cestas de frutas", "Desayuno infantil", "Desayunos", "Merienda y brunch", "Productos adicionales"];
        
        for (let i = 0; i < initialNames.length; i++) {
            const name = initialNames[i];
            const id = this.slugify(name);
            await firstValueFrom(this.http.post(this.API_URL, {
                id,
                name,
                isDefault: name === 'Desayunos',
                order: i
            }, { headers: this.getHeaders() }));
        }
    }

    private slugify(text: string): string {
        return text.toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-z0-9]/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '');
    }

    async saveCategory(category: Category) {
        if (category.id) {
            const oldCat = this.categories().find(c => c.id === category.id);
            if (oldCat && oldCat.name !== category.name) {
                await this.propagateCategoryRename(oldCat.name, category.name);
            }
            await firstValueFrom(this.http.put(`${this.API_URL}/${category.id}`, category, { headers: this.getHeaders() }));
        } else {
            const id = this.slugify(category.name);
            await firstValueFrom(this.http.post(this.API_URL, { ...category, id }, { headers: this.getHeaders() }));
        }
        await this.loadCategories();
    }

    async deleteCategory(id: string) {
        const cat = this.categories().find(c => c.id === id);
        if (cat?.isDefault) {
            throw new Error('No se puede eliminar la categoría predeterminada.');
        }

        await this.reassignProductsToDefault(cat?.name);
        await firstValueFrom(this.http.delete(`${this.API_URL}/${id}`, { headers: this.getHeaders() }));
        await this.loadCategories();
    }

    private async propagateCategoryRename(oldName: string, newName: string) {
        // Implement in backend, frontend simply triggers a dedicated endpoint or does nothing if backend handles
        await firstValueFrom(this.http.post(`${this.API_URL}/rename`, { oldName, newName }, { headers: this.getHeaders() }));
    }

    private async reassignProductsToDefault(oldCategoryName?: string) {
        if (!oldCategoryName) return;
        
        const defaultCat = this.categories().find(c => c.isDefault);
        if (!defaultCat) return;

        await firstValueFrom(this.http.post(`${this.API_URL}/reassign`, { 
            oldCategoryName, 
            newCategoryName: defaultCat.name 
        }, { headers: this.getHeaders() }));
    }
}
