import { Component } from '@angular/core';
import { HeaderComponent } from '../../components/header/header.component';

@Component({
   selector: 'app-aviso-legal',
   standalone: true,
   imports: [HeaderComponent],
   template: `
    <app-header></app-header>
    <main class="container section-padding fade-in">
       <h1 class="page-title title-font">Aviso Legal</h1>
       <div class="legal-image-wrap">
          <img src="assets/images/aviso-legal.png" alt="Aviso Legal">
       </div>
       <div class="legal-text">
          <section>
             <h3>1. Denominación Social</h3>
             <p><strong>Denominación Social:</strong> GRUPO DIAMANTE ESPAÑA<br>
                <strong>Domicilio Social:</strong> Calle del Cine, 42 – Madrid<br>
                <strong>E-Mail:</strong> hola&#64;desayunocondiamante.com</p>
          </section>
          <section>
             <h3>2. Propiedad Intelectual</h3>
             <p>Los derechos de propiedad intelectual de la web, diseño, estructura de navegación, bases de datos y los distintos elementos en él contenidos son titularidad del Grupo Diamante España, a quien corresponde el ejercicio exclusivo de los derechos de explotación de los mismos.</p>
          </section>
          <section>
             <h3>3. Acceso y Uso</h3>
             <p>Estas condiciones generales regulan el acceso y utilización del sitio web de Desayuno con Diamante, que el Grupo Diamante España pone gratuitamente a disposición de los usuarios de Internet.</p>
          </section>
          <!-- ... simplified for demonstration but keeping core sections ... -->
          <section>
              <h3>8. Fuero y Jurisdicción</h3>
              <p>Grupo Diamante España y el usuario se someten al de los juzgados y tribunales del domicilio del usuario para cualquier controversia que pudiera derivarse del acceso a esta web.</p>
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
export class AvisoLegalComponent { }
