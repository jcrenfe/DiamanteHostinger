import { Component } from '@angular/core';
import { HeaderComponent } from '../../components/header/header.component';

@Component({
   selector: 'app-politica-accesibilidad',
   standalone: true,
   imports: [HeaderComponent],
   template: `
    <app-header></app-header>
    <main class="container section-padding fade-in">
       <h1 class="page-title title-font">Política de Accesibilidad</h1>
       <div class="legal-image-wrap">
          <img src="assets/images/politica-accesibilidad.png" alt="Política de Accesibilidad">
       </div>
       <div class="legal-text">
          <section>
             <h3>1. Declaración de Accesibilidad</h3>
             <p>Desayuno con Diamante se ha comprometido a hacer accesible su sitio web, de conformidad con la legislación y los estándares vigentes de diseño web universal. Ponemos un menú específico a su disposición accesible a través del dispositivo flotante lateral para adaptar los contenidos a las situaciones visuales de los usuarios.</p>
          </section>
          <section>
             <h3>2. Opciones Soportadas</h3>
             <p>Nuestro visor consta de varias opciones manuales donde cualquier usuario en todo momento puede forzar cambios tales como:</p>
             <ul>
                 <li>Alterar el contraste, invertir colores y esquemas monocromos.</li>
                 <li>Resaltar todos los enlaces y botones accionables permanentemente.</li>
                 <li>Redimensionar drásticamente los textos e imágenes con la opción de cursor visible.</li>
             </ul>
          </section>
          <section>
             <h3>3. Estado de Cumplimiento</h3>
             <p>Realizamos verificaciones del nivel de coherencia visual para alcanzar al cien por cien la normativa estipulada. Este sitio web es parcialmente conforme como lo ratifica la disponibilidad de herramientas accesorias descrita previamente.</p>
          </section>
          <section>
             <h3>4. Feedback de los Usuarios</h3>
             <p>Si experimenta dificultades de navegación y/o adaptación en parte de nuestros contenidos y las herramientas fallan al satisfacer su barrera de acceso, comuníquenoslo directamente a hola&#64;desayunocondiamante.com indicando la zona objeto de fallo.</p>
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
    ul { list-style-type: disc; margin-left: 20px; }
    @media (max-width: 768px) {
       main.container { padding: 2rem 1.5rem; }
       .page-title { font-size: 2.2rem; }
       .legal-image-wrap { margin-bottom: 2rem; border-radius: 12px; }
       .legal-image-wrap img { height: 250px; border-radius: 12px; }
    }
  `]
})
export class PoliticaAccesibilidadComponent { }
