import { Component } from '@angular/core';
import { HeaderComponent } from '../../components/header/header.component';

@Component({
   selector: 'app-politica-cookies',
   standalone: true,
   imports: [HeaderComponent],
   template: `
    <app-header></app-header>
    <main class="container section-padding fade-in">
       <h1 class="page-title title-font">Política de Cookies</h1>
       <div class="legal-image-wrap">
          <img src="assets/images/politica-cookies.webp" alt="Política de Cookies">
       </div>
       <div class="legal-text">
          <section>
             <h3>1. ¿Qué son las Cookies?</h3>
             <p>Las cookies son pequeños ficheros que se descargan en su dispositivo al acceder a determinadas páginas web. Permiten a una página web, entre otras cosas, analizar hábitos de navegación de un usuario o de su equipo y usarlas para reconocerle.</p>
          </section>
          <section>
             <h3>2. Cookies Básicas (Estrictamente Necesarias)</h3>
             <p>Estas cookies son fundamentales para el buen funcionamiento de la página web. Registran sus preferencias (como el panel de cookies aceptado, sesión abierta, etc.) y no pueden ser desactivadas sin afectar la funcionalidad central.</p>
          </section>
          <section>
             <h3>3. Cookies de Seguimiento / Analíticas</h3>
             <p>Utilizamos estas cookies limitadamente para mejorar la experiencia recogiendo datos sobre el uso de la propia web y para analizar el sistema. A través del aviso inicial al pie, usted tiene el poder de rechazar y borrar estas cookies en cualquier momento.</p>
          </section>
          <section>
             <h3>4. Administración en Navegadores</h3>
             <p>Usted puede permitir, bloquear o eliminar las cookies instaladas en su equipo mediante la configuración de las opciones del navegador instalado en su PC.</p>
          </section>
       </div>
    </main>
  `,
   styles: [`
    .page-title { font-size: 3rem; margin-bottom: 2rem; text-align: center; }
    .legal-image-wrap { margin-bottom: 3rem; border-radius: var(--radius-lg); overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.1); max-height: 400px; display: flex; justify-content: center; width: 100%; }
    .legal-image-wrap img { width: 100%; max-width: 1200px; height: 400px; object-fit: cover; border-radius: var(--radius-lg); }
    .legal-text { line-height: 1.8; color: var(--text-dark); max-width: 900px; margin: 0 auto; }
    .legal-text section { margin-bottom: 2.5rem; }
    .legal-text h3 { margin-bottom: 1rem; color: var(--primary); font-family: var(--font-title); }
    @media (max-width: 768px) {
       main.container { padding: 2rem 1.5rem; }
       .page-title { font-size: 2.2rem; }
       .legal-image-wrap { margin-bottom: 2rem; border-radius: 12px; }
       .legal-image-wrap img { height: 250px; border-radius: 12px; }
    }
  `]
})
export class PoliticaCookiesComponent { }
