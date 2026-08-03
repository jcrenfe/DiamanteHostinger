import { Component } from '@angular/core';
import { HeaderComponent } from '../../components/header/header.component';

@Component({
    selector: 'app-politica-privacidad',
    standalone: true,
    imports: [HeaderComponent],
    template: `
    <app-header></app-header>
    <main class="container section-padding fade-in">
       <h1 class="page-title title-font">Política de Privacidad</h1>
       <div class="legal-image-wrap">
          <img src="assets/images/politica-privacidad.png" alt="Política de Privacidad">
       </div>
       <div class="legal-text">
          <section>
             <h3>1. Responsable del Tratamiento</h3>
             <p><strong>Identidad:</strong> GRUPO DIAMANTE ESPAÑA<br>
                <strong>Dirección:</strong> Calle del Cine, 42 – Madrid<br>
                <strong>E-Mail:</strong> hola&#64;desayunocondiamante.com</p>
          </section>
          <section>
             <h3>2. Finalidad del Tratamiento</h3>
             <p>Sus datos personales se utilizarán para gestionar su compra, enviarle información sobre el estado de su pedido y mantenerle informado de ofertas comerciales y novedades, siempre que contemos con su consentimiento explícito para ello.</p>
          </section>
          <section>
             <h3>3. Conservación de los Datos</h3>
             <p>Los datos se conservarán durante el tiempo necesario para cumplir con la finalidad para la que fueron recabados y determinar las posibles responsabilidades que se pudieran derivar de dicha finalidad.</p>
          </section>
          <section>
             <h3>4. Cesión y Destinatarios</h3>
             <p>Los datos no se cederán a terceros, salvo obligación legal, o a aquellas empresas proveedoras (como transportistas) que sean estrictamente necesarias para realizar la entrega de su pedido.</p>
          </section>
          <section>
              <h3>5. Derechos de los Usuarios</h3>
              <p>Tiene derecho a acceder a sus datos, rectificarlos, suprimirlos o portarlos, así como la limitación u oposición a su tratamiento, poniéndose en contacto con nosotros a través del correo facilitado.</p>
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
export class PoliticaPrivacidadComponent { }
