import { Injectable, inject } from '@angular/core';
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    sendPasswordResetEmail,
    GoogleAuthProvider,
    signInWithRedirect,
    signInWithPopup,
    getRedirectResult,
    User as FirebaseUser
} from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from '../app.firebase';
import { AuthStore, UserProfile } from '../store/auth.store';
import { Router } from '@angular/router';

@Injectable({
    providedIn: 'root'
})
export class AuthService {
    private store = inject(AuthStore);
    private router = inject(Router);

    constructor() {
        this.init();
    }

    // Subscribe to auth state changes and handle redirects
    private async init() {
        this.store.setLoading(true);

        // ONLY execute redirect check if we might be coming back from one
        // (Checking sessionStorage flags or similar can help, but a try/catch is essential)
        try {
            const result = await getRedirectResult(auth);
            if (result && result.user) {
                await this.syncUserProfile(result.user);
                if (this.store.isAdmin()) {
                    this.router.navigate(['/admin']);
                } else {
                    this.router.navigate(['/']);
                }
            }
        } catch (error: any) {
            // Don't show an intrusive error for cancelled redirects
            if (error.code !== 'auth/popup-closed-by-user' && error.code !== 'auth/cancelled-popup-request') {
                this.store.setError(this.getFriendlyErrorMessage(error.code));
            }
        }

        onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                await this.syncUserProfile(firebaseUser);
            } else {
                this.store.setUser(null);
            }
            this.store.setLoading(false);
        });
    }

    // Sync Auth user with Firestore Profile/Role
    private async syncUserProfile(firebaseUser: FirebaseUser) {
        const userDocRef = doc(db, "users", firebaseUser.uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
            const data = userDoc.data();
            this.store.setUser({
                uid: firebaseUser.uid,
                email: firebaseUser.email,
                displayName: data['displayName'] || firebaseUser.displayName,
                photoURL: firebaseUser.photoURL,
                role: data['role'] || 'cliente'
            });
        } else {
            // Create profile if first time
            const newProfile: UserProfile = {
                uid: firebaseUser.uid,
                email: firebaseUser.email,
                displayName: firebaseUser.displayName,
                photoURL: firebaseUser.photoURL,
                role: 'cliente' // Default role
            };
            await setDoc(userDocRef, { ...newProfile, createdAt: serverTimestamp() });
            this.store.setUser(newProfile);
        }
    }

    // Manual Signup
    async signup(email: string, pass: string, name: string) {
        this.store.setLoading(true);
        this.store.clearError();
        try {
            const credential = await createUserWithEmailAndPassword(auth, email, pass);
            const user = credential.user;

            const userProfile: UserProfile = {
                uid: user.uid,
                email: user.email,
                displayName: name,
                photoURL: null,
                role: 'cliente'
            };

            await setDoc(doc(db, "users", user.uid), { ...userProfile, createdAt: serverTimestamp() });
            this.store.setUser(userProfile);
            this.router.navigate(['/']);
        } catch (err: any) {
            this.store.setError(this.getFriendlyErrorMessage(err.code));
        }
    }

    // Manual Login
    async login(email: string, pass: string) {
        this.store.setLoading(true);
        this.store.clearError();
        try {
            const credential = await signInWithEmailAndPassword(auth, email, pass);
            await this.syncUserProfile(credential.user);
            if (this.store.isAdmin()) {
                this.router.navigate(['/admin']);
            } else {
                this.router.navigate(['/']);
            }
        } catch (err: any) {
            this.store.setError(this.getFriendlyErrorMessage(err.code));
        }
    }

    // Google Login - NEW REDIRECT METHOD
    async loginWithGoogle() {
        this.store.setLoading(true);
        this.store.clearError();
        const provider = new GoogleAuthProvider();
        try {
            // Forzamos "Popup" de nuevo, pero con parámetros personalizados.
            // NOTA: Si esto falla en localhost es porque Chrome/Google ChromeIdentity bloquea authDomains locales.
            // Para probar en local, usa el emulador de Auth o Email/Contraseña.
            const credential = await signInWithPopup(auth, provider);
            await this.syncUserProfile(credential.user);
            if (this.store.isAdmin()) {
                this.router.navigate(['/admin']);
            } else {
                this.router.navigate(['/']);
            }
        } catch (err: any) {
            this.store.setError(this.getFriendlyErrorMessage(err.code));
        }
    }

    // Password Recovery
    async resetPassword(email: string) {
        try {
            await sendPasswordResetEmail(auth, email);
        } catch (err: any) {
            throw err;
        }
    }

    // Logout
    async logout() {
        this.store.setLoading(true);
        try {
            await signOut(auth);
            this.store.setUser(null);
            this.router.navigate(['/']);
        } catch (err: any) {
            this.store.setError(this.getFriendlyErrorMessage(err.code || err.message));
        }
    }

    public getFriendlyErrorMessage(code: string): string {
        switch (code) {
            // Login & General
            case 'auth/invalid-credential':
            case 'auth/wrong-password':
                return 'Parece que el correo o la contraseña no coinciden con nuestros registros. ¿Podrías revisarlos?';
            case 'auth/user-not-found':
                return 'Lo siento, no parece que estés registrado aún con este correo. ¡Pero no te preocupes, puedes crear tu cuenta en un momento desde la opción de Registro!';
            case 'auth/user-disabled':
                return 'Esta cuenta ha sido desactivada temporalmente. Por favor, contacta con nosotros para ver qué ha pasado y ayudarte a volver.';
            case 'auth/too-many-requests':
                return '¡Vaya! Parece que ha habido demasiados intentos por seguridad. Tómate un pequeño descanso y vuelve a intentarlo en unos minutos.';

            // Signup
            case 'auth/email-already-in-use':
                return 'Este correo ya es parte de nuestra familia. Si ya tienes cuenta, prueba a entrar directamente o recupera tu clave si no la recuerdas.';
            case 'auth/invalid-email':
                return 'Ese correo no parece tener el formato adecuado (ejemplo@correo.com). ¿Podrías echarle un vistazo?';
            case 'auth/operation-not-allowed':
                return 'El registro con email no está disponible en este momento. Estamos trabajando para que vuelva pronto.';
            case 'auth/weak-password':
                return '¡Esa contraseña es un poco tímida! Para proteger bien tu cuenta, te pedimos que tenga al menos 6 caracteres mezclando letras y números si es posible.';

            // Google Login
            case 'auth/popup-closed-by-user':
                return 'Parece que la ventana de Google se cerró antes de tiempo. ¡No pasa nada! Pulsa de nuevo para intentarlo.';
            case 'auth/cancelled-by-user':
                return 'Has cancelado el proceso con Google. Si prefieres otro método, puedes usar tu email y una contraseña.';

            default:
                return 'Lo sentimos, algo no ha salido como esperábamos. Por favor, inténtalo de nuevo en unos segundos.';
        }
    }
}
