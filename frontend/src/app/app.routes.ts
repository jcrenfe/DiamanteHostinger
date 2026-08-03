import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';
import { LoginComponent } from './pages/login/login.component';
import { SignupComponent } from './pages/signup/signup.component';
import { AvisoLegalComponent } from './pages/legal/aviso-legal.component';
import { PoliticaPrivacidadComponent } from './pages/legal/politica-privacidad.component';
import { PoliticaCookiesComponent } from './pages/legal/politica-cookies.component';
import { PoliticaAccesibilidadComponent } from './pages/legal/politica-accesibilidad.component';
import { ContactoComponent } from './pages/contacto/contacto.component';
import { OfertasComponent } from './pages/ofertas/ofertas.component';

import { authGuard } from './guards/auth.guard';
import { adminGuard } from './guards/admin.guard';
import { unsavedChangesGuard } from './guards/unsaved-changes.guard';

// Product Pages
import { ProductListComponent } from './pages/productos/product-list.component';
import { ProductDetailComponent } from './pages/productos/product-detail.component';

// Checkout Pages
import { CheckoutComponent } from './pages/checkout/checkout.component';
import { CheckoutSuccessComponent } from './pages/checkout/result/success.component';
import { CheckoutFailComponent } from './pages/checkout/result/fail.component';
import { MyOrdersComponent } from './pages/mis-pedidos/my-orders.component';

// Admin Pages
import { AdminLayoutComponent } from './pages/admin/admin-layout.component';
import { AdminDashboardComponent } from './pages/admin/admin-dashboard.component';
import { ProductManagerComponent } from './pages/admin/product-manager.component';
import { OrderManagerComponent } from './pages/admin/order-manager.component';
import { AppointmentManagerComponent } from './pages/admin/appointment-manager.component';
import { OfferManagerComponent } from './pages/admin/offer-manager.component';
import { CampaignManagerComponent } from './pages/admin/campaign-manager.component';
import { RouteOptimizerComponent } from './pages/admin/route-optimizer.component';
import { CategoryManagerComponent } from './pages/admin/category-manager.component';

export const routes: Routes = [
    { path: '', component: HomeComponent },
    { path: 'productos', component: ProductListComponent },
    { path: 'ofertas', component: OfertasComponent },
    { path: 'producto/:slug', component: ProductDetailComponent },

    // Checkout Flow
    { path: 'checkout', component: CheckoutComponent },
    { path: 'checkout/success', component: CheckoutSuccessComponent },
    { path: 'checkout/fail', component: CheckoutFailComponent },
    { path: 'mis-pedidos', component: MyOrdersComponent, canActivate: [authGuard] },

    // Admin Panel (Grouped)
    {
        path: 'admin',
        component: AdminLayoutComponent,
        canActivate: [adminGuard],
        children: [
            { path: '', component: AdminDashboardComponent },
            { path: 'productos', component: ProductManagerComponent },
            { path: 'pedidos', component: OrderManagerComponent },
            { 
              path: 'citas', 
              component: AppointmentManagerComponent,
              canDeactivate: [unsavedChangesGuard]
            },
            { path: 'ofertas', component: OfferManagerComponent },
            { path: 'campanas', component: CampaignManagerComponent },
            { path: 'rutas', component: RouteOptimizerComponent },
            { path: 'categorias', component: CategoryManagerComponent }
        ]
    },

    // Auth & Others
    { path: 'login', component: LoginComponent },
    { path: 'signup', component: SignupComponent },
    { path: 'contacto', component: ContactoComponent },
    { path: 'aviso-legal', component: AvisoLegalComponent },
    { path: 'politica-privacidad', component: PoliticaPrivacidadComponent },
    { path: 'politica-cookies', component: PoliticaCookiesComponent },
    { path: 'politica-accesibilidad', component: PoliticaAccesibilidadComponent },
    { path: '**', redirectTo: '' }
];
