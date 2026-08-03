import { Injectable, signal, computed } from '@angular/core';

export interface UserProfile {
    uid: string;
    email: string | null;
    displayName: string | null;
    photoURL: string | null;
    role: 'admin' | 'cliente' | null;
}

@Injectable({
    providedIn: 'root'
})
export class AuthStore {
    // Signals State
    private _user = signal<UserProfile | null>(null);
    private _loading = signal<boolean>(true);
    private _authError = signal<string | null>(null);

    // Computed Selectors
    user = computed(() => this._user());
    loading = computed(() => this._loading());
    error = computed(() => this._authError());
    isAuthenticated = computed(() => !!this._user());
    isAdmin = computed(() => this._user()?.role === 'admin');

    // Actions
    setUser(userData: UserProfile | null) {
        this._user.set(userData);
        this._loading.set(false);
    }

    setLoading(isLoading: boolean) {
        this._loading.set(isLoading);
    }

    setError(errorMessage: string | null) {
        this._authError.set(errorMessage);
        this._loading.set(false);
    }

    clearError() {
        this._authError.set(null);
    }
}
