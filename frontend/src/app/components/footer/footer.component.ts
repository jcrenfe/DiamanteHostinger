import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [RouterLink],
  template: `
    <footer class="footer">
      <div class="container footer-grid">
        <div class="footer-brand">
          <h3 class="title-font">Desayuno con Diamante</h3>
          <p>Llevando la tradición y el calor del hogar a cada puerta. Especialistas en momentos inolvidables.</p>
          <div class="social-links mt-4">
             <a href="https://www.instagram.com/desayunocondiamantevalladolid" target="_blank" rel="noopener" class="social-icon" aria-label="Instagram">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
                <span class="social-text">Síguenos en Instagram</span>
             </a>
          </div>
        </div>
        
        <div class="footer-links">
          <h4 class="title-font">Enlaces Rápidos</h4>
          <ul>
            <li><a routerLink="/aviso-legal">Aviso Legal</a></li>
            <li><a routerLink="/politica-privacidad">Privacidad</a></li>
            <li><a routerLink="/politica-cookies">Cookies</a></li>
            <li><a routerLink="/politica-accesibilidad">Accesibilidad</a></li>
          </ul>
        </div>
        
        <div class="footer-contact">
          <h4 class="title-font">Contacto</h4>
          <p>Email: hola&#64;desayunocondiamante.com</p>
          <p>Tel: +34 900 000 000</p>
          <p>Dirección: Calle de la Ilusión, 12, Madrid</p>
        </div>
      </div>
      <div class="footer-bottom">
        <div class="container">
          <p>&copy; 2026 Desayuno con Diamante. Hecho con 
            <svg class="footer-heart" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
            </svg> 
            para tu familia.</p>
        </div>
      </div>
    </footer>
  `,
  styles: [`
    .footer {
      background: var(--primary);
      color: white;
      padding-top: 4rem;
      margin-top: 5rem;
    }
    .footer-grid {
      display: grid;
      grid-template-columns: 2fr 1fr 1fr;
      gap: 4rem;
      padding-bottom: 4rem;
    }
    .footer-brand h3 { color: white; margin-bottom: 1rem; }
    .footer-brand p { color: rgba(255,255,255,0.8); max-width: 400px; }
    .social-links { display: flex; gap: 1rem; }
    .social-icon { color: white; opacity: 0.8; transition: var(--transition-smooth); display: flex; align-items: center; gap: 0.8rem; }
    .social-icon:hover { opacity: 1; transform: translateY(-3px); color: var(--secondary); }
    .social-text { font-size: 0.95rem; font-weight: 500; }
    .footer-links h4, .footer-contact h4 { color: white; margin-bottom: 1.5rem; font-size: 1.25rem; }
    .footer-links ul { display: flex; flex-direction: column; gap: 0.8rem; }
    .footer-links a { color: rgba(255,255,255,0.8); }
    .footer-links a:hover { color: var(--secondary); transform: translateX(5px); display: inline-block; }
    .footer-bottom {
      background: rgba(0,0,0,0.1);
      padding: 1.5rem 0 calc(1.5rem + 30px) 0;
      text-align: center;
      font-size: 0.9rem;
      color: rgba(255,255,255,0.6);
      display: flex;
      justify-content: center;
      align-items: center;
    }
    .footer-heart {
      width: 18px;
      height: 18px;
      display: inline-block;
      vertical-align: middle;
      color: var(--secondary);
      margin: 0 6px;
      stroke-width: 2.5px;
    }
    @media (max-width: 768px) {
      .footer-grid { grid-template-columns: 1fr; gap: 3rem; text-align: center; }
      .footer-brand p { margin: 0 auto; }
    }
  `]
})
export class FooterComponent { }
