import { Injectable, signal, computed } from '@angular/core';

export interface ResourceMap {
    id: string;
    url_origen: string;
    ruta_imagen?: string;
    ruta_texto?: string;
    textos_asociados?: string[];
    contenido_resumen?: string;
    tipo: 'asociado' | 'libre';
    // Mapped fields
    name?: string;
    price?: number;
    priceStr?: string;
    description?: string;
    category?: string;
    local_image_path?: string;
    showOnHome?: boolean;
}

@Injectable({
    providedIn: 'root'
})
export class AppStore {
    // Signals State
    private _resources = signal<ResourceMap[]>([]);
    private _loading = signal<boolean>(true);
    private _error = signal<string | null>(null);

    // Computed signals (Selectors)
    resources = computed(() => this._resources());
    loading = computed(() => this._loading());
    error = computed(() => this._error());

    // Actions
    setResources(data: ResourceMap[]) {
        this._resources.set(data);
        this._loading.set(false);
    }

    setError(errorMessage: string) {
        this._error.set(errorMessage);
        this._loading.set(false);
    }

    setLoading(isLoading: boolean) {
        this._loading.set(isLoading);
    }
}
