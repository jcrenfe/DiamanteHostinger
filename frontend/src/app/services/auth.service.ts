import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AuthStore, UserProfile } from '../store/auth.store';
import { Router } from '@angular/router';
import { environment } from '../../environments/environment';
import { firstValueFrom } from 'rxjs';

// Firebase se carga de forma lazy, solo cuando el usuario pulsa "Login con Google"
// Esto evita el polling COOP en el panel de admin y la carga inicial pesada
let _auth: any = null;

async function getFirebaseAuth() {
    if (_auth) return _auth;
    const { initializeApp, getApps, getApp } = await import('firebase/app');
    const { getAuth } = await import('firebase/auth');
    const firebaseConfig = {
        apiKey: "AIzaSyDNWHYREyyCz8-tXEVrSbCIr0bFa8MrnzU",
        authDomain: "diamante-f70f4.firebaseapp.com",
        projectId: "diamante-f70f4",
        storageBucket: "diamante-f70f4.appspot.com",
        messagingSenderId: "257504398244",
        appId: "1:257504398244:web:65afd7a599dad8434a4f31"
    };
    const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    _auth = getAuth(app);
    return _auth;
}

@Injectable({
    providedIn: 'root'
})
export class AuthService {
    private store = inject(AuthStore);
    private router = inject(Router);
    private http = inject(HttpClient);
    private readonly API_URL = `${environment.apiUrl}/auth`;

    constructor() {
        this.init();
    }

    private async init() {
        this.store.setLoading(true);
        const token = localStorage.getItem('token');
        const userJson = localStorage.getItem('user');

        if (token && userJson) {
            try {
                const user = JSON.parse(userJson);
                this.store.setUser(user);
            } catch (e) {
                this.logout();
            }
        }
        this.store.setLoading(false);
    }

    async signup(email: string, pass: string, name: string) {
        this.store.setLoading(true);
        this.store.clearError();
        try {
            const response = await firstValueFrom(
                this.http.post<{token: string, user: UserProfile}>(`${this.API_URL}/register`, {
                    email, password: pass, displayName: name
                })
            );
            if (response) {
                localStorage.setItem('token', response.token);
                localStorage.setItem('user', JSON.stringify(response.user));
                this.store.setUser(response.user);
                this.router.navigate(['/']);
            }
        } catch (err: any) {
            this.store.setError(err.error?.error || 'Error en el registro');
            this.store.setLoading(false);
        }
    }

    async login(email: string, pass: string) {
        this.store.setLoading(true);
        this.store.clearError();
        try {
            const response = await firstValueFrom(
                this.http.post<{token: string, user: UserProfile}>(`${this.API_URL}/login`, {
                    email, password: pass
                })
            );
            if (response) {
                localStorage.setItem('token', response.token);
                localStorage.setItem('user', JSON.stringify(response.user));
                this.store.setUser(response.user);
                if (this.store.isAdmin()) {
                    this.router.navigate(['/admin']);
                } else {
                    this.router.navigate(['/']);
                }
            }
        } catch (err: any) {
            this.store.setError(err.error?.error || 'Credenciales inválidas');
            this.store.setLoading(false);
        }
    }

    async loginWithGoogle() {
        this.store.setLoading(true);
        this.store.clearError();
        try {
            // Carga lazy de Firebase: solo se descarga cuando el usuario pulsa el botón
            const auth = await getFirebaseAuth();
            const { signInWithPopup, GoogleAuthProvider } = await import('firebase/auth');

            const provider = new GoogleAuthProvider();
            const credential = await signInWithPopup(auth, provider);
            const user = credential.user;

            const response = await firstValueFrom(
                this.http.post<{token: string, user: UserProfile}>(`${this.API_URL}/google`, {
                    email: user.email,
                    displayName: user.displayName || user.email?.split('@')[0],
                    uid: user.uid,
                    photoURL: user.photoURL
                })
            );

            if (response) {
                localStorage.setItem('token', response.token);
                localStorage.setItem('user', JSON.stringify(response.user));
                this.store.setUser(response.user);
                if (this.store.isAdmin()) {
                    this.router.navigate(['/admin']);
                } else {
                    this.router.navigate(['/']);
                }
            }
        } catch (err: any) {
            console.error('Google Auth Error:', err);
            this.store.setError(err.error?.error || err.message || 'Error al iniciar sesión con Google');
            this.store.setLoading(false);
        }
    }

    async resetPassword(email: string) {
        throw new Error("Reset password no implementado en el backend aún");
    }

    async logout() {
        this.store.setLoading(true);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        this.store.setUser(null);
        this.router.navigate(['/']);
    }
}
