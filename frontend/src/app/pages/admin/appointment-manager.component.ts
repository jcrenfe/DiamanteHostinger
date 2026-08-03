import { Component, inject, signal, OnInit } from '@angular/core';
import { ToastService } from '../../services/toast.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AppointmentService, AppointmentConfig, TimeRange } from '../../services/appointment.service';
import { ConfirmDialogService } from '../../services/confirm-dialog.service';

@Component({
  selector: 'app-appointment-manager',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="availability-manager fade-in">
      <div class="page-header">
        <div>
          <h1 class="title-font">Gestión de Disponibilidad</h1>
          <p class="text-muted">Configura cuándo y cómo repartes tus desayunos.</p>
        </div>
        <button class="btn btn-primary" (click)="saveConfig()" [disabled]="loading()">
          {{ loading() ? 'Guardando...' : 'Guardar Cambios' }}
        </button>
      </div>

      <div class="admin-grid-layout mt-4" *ngIf="config()">
        <!-- Block 1: Días de Reparto (Calendario) -->
        <div class="admin-card">
          <div class="card-header">
            <h3 class="title-font">1. Días de Reparto</h3>
            <div class="calendar-controls">
              <button class="btn-icon" (click)="prevMonth()">&lt;</button>
              <span class="month-label">{{ currentMonthName }} {{ currentYear }}</span>
              <button class="btn-icon" (click)="nextMonth()">&gt;</button>
            </div>
          </div>
          <div class="calendar-instruction">
            <small>Clic: Activar/Desactivar día. Doble clic: Seleccionar periodo.</small>
          </div>
          
          <div class="calendar-grid">
            <div class="day-name" *ngFor="let name of weekDayNames">{{ name }}</div>
            <div 
              *ngFor="let day of calendarDays" 
              class="calendar-day"
              [class.not-current]="!day.currentMonth"
              [class.active]="isDeliveryDay(day.dateStr)"
              [class.today]="isToday(day.dateStr)"
              [class.selection-origin]="selectionStart === day.dateStr"
              (click)="handleDayClick(day.dateStr)"
              (dblclick)="onDayDoubleClick(day.dateStr)"
            >
              {{ day.day }}
            </div>
          </div>
        </div>

        <!-- Block 2: Disponibilidad Diaria -->
        <div class="admin-card">
          <h3 class="title-font mb-3">2. Disponibilidad Diaria</h3>
          <p class="text-muted small mb-4">Define tramos horarios por día de la semana.</p>
          
          <div class="weekday-list admin-scrollable">
            <div class="weekday-row" *ngFor="let day of weekdays">
              <div class="weekday-header">
                <span class="weekday-name">{{ day.name }}</span>
                <div class="weekday-actions">
                  <button 
                    class="copy-btn" 
                    [class.copy-source]="copySource() === day.id"
                    [class.copy-target]="copyTargets().includes(day.id)"
                    (click)="handleCopyClick(day.id)"
                    [title]="getCopyTooltip(day.id)"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                  </button>
                  <button 
                    class="copy-btn add-btn" 
                    (click)="openAddSlot(day.id)"
                    title="Añadir tramo horario"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                  </button>
                </div>
              </div>
              <div class="slots-container">
                <div class="time-slot-tag" *ngFor="let range of config()!.dailySlots[day.id]; let i = index">
                  {{ range.start }} - {{ range.end }}
                  <button class="remove-slot" (click)="removeSlot(day.id, i)">&times;</button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Block 3: Bloqueo de Citas -->
        <div class="admin-card">
          <h3 class="title-font mb-3">3. Bloqueo de Citas</h3>
          <p class="text-muted small mb-4">Minutos a bloquear antes y después de cada reserva según CP.</p>
          
          <div class="blocking-grid">
            <div class="blocking-section" *ngFor="let type of ['near', 'medium', 'far']">
               <h4 class="proximity-label">{{ getProximityLabel(type) }}</h4>
               <div class="blocking-inputs">
                  <div class="form-group">
                    <label>Antes (min)</label>
                    <input type="number" [(ngModel)]="config()!.blockingRules[type].beforeMinutes" step="30" min="0">
                  </div>
                  <div class="form-group">
                    <label>Después (min)</label>
                    <input type="number" [(ngModel)]="config()!.blockingRules[type].afterMinutes" step="30" min="0">
                  </div>
               </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Add Slot Modal (Simple replacement for prompt) -->
      <div class="modal-overlay" *ngIf="showAddSlot()">
        <div class="modal-content admin-card">
          <h3 class="title-font">Añadir Tramo para {{ getDayName(activeDayId()) }}</h3>
          <div class="form-row mt-4">
             <div class="form-group">
               <label>Inicio</label>
               <select [(ngModel)]="newSlot.start">
                 <option *ngFor="let t of possibleTimes" [value]="t">{{ t }}</option>
               </select>
             </div>
             <div class="form-group">
               <label>Fin</label>
               <select [(ngModel)]="newSlot.end">
                 <option *ngFor="let t of possibleTimes" [value]="t">{{ t }}</option>
               </select>
             </div>
          </div>
          <div class="modal-actions mt-4">
             <button class="btn btn-outline" (click)="showAddSlot.set(false)">Cancelar</button>
             <button class="btn btn-primary" (click)="addSlot()">Añadir</button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .availability-manager { padding-bottom: 4rem; }
    .page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1.5rem; }
    .page-header h1 { font-size: 1.5rem; margin-bottom: 0.25rem; }
    .page-header p { font-size: 0.9rem; }
    
    .admin-grid-layout { 
      display: grid; 
      grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); 
      gap: 1.5rem; 
      align-items: start;
    }
    
    @media (max-width: 1024px) {
      .admin-grid-layout { 
        display: flex; 
        flex-direction: column; 
        gap: 1.5rem;
      }
      .admin-card { min-width: 100%; }
    }

    .admin-card { background: white; padding: 1.5rem; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
    .admin-card h3 { font-size: 1.1rem; margin-bottom: 1rem; }
    
    /* Calendar */
    .card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
    .calendar-controls { display: flex; align-items: center; gap: 0.5rem; }
    .month-label { font-weight: 700; min-width: 120px; text-align: center; color: var(--primary); font-size: 0.95rem; }
    .calendar-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 1px; background: #eee; border: 1px solid #eee; }
    .day-name { background: #f8fafc; padding: 0.5rem; text-align: center; font-size: 0.7rem; font-weight: 700; color: #64748b; }
    .calendar-day { 
      background: white; padding: 0.8rem 0.2rem; text-align: center; cursor: pointer; font-size: 0.85rem;
      transition: all 0.2s; position: relative;
    }
    .calendar-day:hover { background: #f1f5f9; }
    .calendar-day.not-current { color: #cbd5e1; }
    .calendar-day.active { background: #dcfce7; color: #166534; font-weight: 700; }
    .calendar-day.selection-origin { background: #e0f2fe; color: #0369a1; font-weight: 700; border: 2px solid #7dd3fc; }
    .calendar-day.today { border: 2px solid var(--secondary); }
    .calendar-instruction { margin-bottom: 1rem; color: #64748b; }

    /* Weekday Slots */
    .admin-scrollable { max-height: 450px; overflow-y: auto; padding-right: 0.5rem; }
    .admin-scrollable::-webkit-scrollbar { width: 4px; }
    .admin-scrollable::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
    
    .weekday-row { display: flex; align-items: center; padding: 0.5rem 0; border-bottom: 1px solid #f8fafc; min-height: 48px; }
    .weekday-header { width: 130px; display: flex; align-items: center; gap: 0.5rem; }
    .weekday-name { font-weight: 700; color: var(--primary); font-size: 0.85rem; flex: 1; }
    .weekday-actions { display: flex; align-items: center; gap: 0.2rem; }
    
    .copy-btn { 
      background: none; border: none; color: #94a3b8; cursor: pointer; padding: 0.4rem; border-radius: 4px;
      display: flex; align-items: center; justify-content: center; transition: all 0.2s;
    }
    .copy-btn:hover { background: #f1f5f9; color: var(--primary); }
    .copy-btn.copy-source { color: #22c55e; background: #f0fdf4; }
    .copy-btn.copy-target { color: #3b82f6; background: #eff6ff; }
    .add-btn { color: var(--secondary); }
    .add-btn:hover { background: #fffcf8; }

    .slots-container { flex: 1; display: flex; flex-wrap: wrap; gap: 0.25rem; padding: 0.25rem 0; }
    .time-slot-tag { 
      background: #f8fafc; padding: 0.2rem 0.5rem; border-radius: 4px; font-size: 0.75rem; font-weight: 600;
      display: flex; align-items: center; gap: 0.3rem; border: 1px solid #f1f5f9; height: 24px;
    }
    .remove-slot { border: none; background: none; color: #94a3b8; font-size: 1rem; cursor: pointer; line-height: 1; }
    .remove-slot:hover { color: #ef4444; }

    /* Proximity Blocking */
    .blocking-grid { display: flex; flex-direction: column; gap: 1rem; }
    .proximity-label { text-transform: capitalize; font-size: 0.95rem; color: var(--primary); margin-bottom: 0.4rem; border-bottom: 2px solid #fdf2f2; padding-bottom: 0.2rem; }
    .blocking-inputs { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
    .form-group label { font-size: 0.75rem; font-weight: 700; color: #64748b; margin-bottom: 0.4rem; }
    .form-group input, .form-group select { 
      padding: 0.7rem; border: 1px solid #e2e8f0; border-radius: 8px; width: 100%; font-size: 0.95rem; 
      background-color: #f8fafc; color: var(--primary); outline: none; transition: all 0.2s;
    }
    .form-group select:focus { border-color: var(--secondary); background-color: white; box-shadow: 0 0 0 3px rgba(180, 83, 9, 0.1); }

    /* Modal */
    /* Modal centering & styling */
    .modal-overlay { 
      position: fixed; top: 0; left: 0; right: 0; bottom: 0;
      width: 100%; height: 100%; 
      background: rgba(0,0,0,0.5); 
      z-index: 2000; 
      display: flex; align-items: center; justify-content: center; 
      backdrop-filter: blur(4px);
    }
    .modal-content { 
      width: 90%; max-width: 450px; 
      background: white; border-radius: 16px; padding: 2.5rem;
      box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04);
      animation: slideUp 0.3s ease-out; 
    }
    .modal-actions { display: flex; justify-content: flex-end; gap: 1rem; margin-top: 2rem; }
    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; }
    @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
  `]
})
export class AppointmentManagerComponent implements OnInit {
  private appointmentService = inject(AppointmentService);
  private toastService = inject(ToastService);
  private confirmService = inject(ConfirmDialogService);

  config = signal<AppointmentConfig | null>(null);
  loading = signal(false);

  // Calendar State
  currentDate = new Date();
  calendarDays: any[] = [];
  weekDayNames = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
  
  // Daily Availability State
  weekdays = [
    { id: '1', name: 'Lunes' },
    { id: '2', name: 'Martes' },
    { id: '3', name: 'Miércoles' },
    { id: '4', name: 'Jueves' },
    { id: '5', name: 'Viernes' },
    { id: '6', name: 'Sábado' },
    { id: '0', name: 'Domingo' }
  ];

  showAddSlot = signal(false);
  activeDayId = signal('');
  newSlot = { start: '09:00', end: '13:00' };

  // Generate 48 items (00:00, 00:30, 01:00... 23:30)
  possibleTimes = Array.from({ length: 48 }, (_, i) => {
    const h = Math.floor(i / 2).toString().padStart(2, '0');
    const m = (i % 2 === 0 ? '00' : '30');
    return `${h}:${m}`;
  });

  // Multi-select state
  selectionStart: string | null = null;

  copySource = signal<string | null>(null);
  copyTargets = signal<string[]>([]);
  isSubmitting = signal(false);
  isModified = signal(false);

  async ngOnInit() {
    this.loadConfig();
    this.generateCalendar();
  }

  async loadConfig() {
    const data = await this.appointmentService.getConfig();
    this.config.set(data);
  }

  // --- Calendar Methods ---
  generateCalendar() {
    const year = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    // Adjust for Monday start (0=Sun, 1=Mon... -> 0=Mon, 6=Sun)
    let startDayIdx = firstDay.getDay() - 1;
    if (startDayIdx === -1) startDayIdx = 6; 

    const days = [];
    
    // Fill previous month gaps
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startDayIdx - 1; i >= 0; i--) {
      const d = new Date(year, month - 1, prevMonthLastDay - i);
      days.push({ day: d.getDate(), dateStr: this.formatDate(d), currentMonth: false });
    }

    // Current month days
    for (let i = 1; i <= lastDay.getDate(); i++) {
      const d = new Date(year, month, i);
      days.push({ day: i, dateStr: this.formatDate(d), currentMonth: true });
    }

    // Fill next month gaps
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(year, month + 1, i);
      days.push({ day: i, dateStr: this.formatDate(d), currentMonth: false });
    }

    this.calendarDays = days;
  }

  formatDate(date: Date): string {
    const y = date.getFullYear();
    const m = (date.getMonth() + 1).toString().padStart(2, '0');
    const d = date.getDate().toString().padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  isDeliveryDay(dateStr: string): boolean {
    return this.config()?.deliveryDays.includes(dateStr) || false;
  }

  isToday(dateStr: string): boolean {
    return dateStr === this.formatDate(new Date());
  }

  handleDayClick(dateStr: string) {
    if (this.selectionStart) {
      this.selectRange(this.selectionStart, dateStr);
      this.selectionStart = null;
    } else {
      this.toggleDay(dateStr);
    }
  }

  toggleDay(dateStr: string) {
    if (!this.config()) return;
    const days = [...this.config()!.deliveryDays];
    const index = days.indexOf(dateStr);
    
    if (index > -1) {
      days.splice(index, 1);
    } else {
      days.push(dateStr);
    }
    
    this.config.update(c => c ? ({ ...c, deliveryDays: days }) : null);
    this.isModified.set(true);
  }

  onDayDoubleClick(dateStr: string) {
    this.selectionStart = dateStr;
    this.toastService.info('Periodo iniciado. Haz clic en el día final.');
  }

  selectRange(start: string, end: string) {
    const parseLocal = (s: string) => {
      const [y, m, d] = s.split('-').map(Number);
      return new Date(y, m - 1, d);
    };
    const startDate = parseLocal(start < end ? start : end);
    const endDate = parseLocal(start < end ? end : start);
    
    const initialStatus = this.isDeliveryDay(start);
    const days = [...this.config()!.deliveryDays];
    let curr = new Date(startDate);
    
    while (curr <= endDate) {
      const dStr = this.formatDate(curr);
      const index = days.indexOf(dStr);
      
      if (initialStatus) {
        // If starting day was active, we deselect the whole range
        if (index > -1) days.splice(index, 1);
      } else {
        // If starting day was inactive, we select the whole range
        if (index === -1) days.push(dStr);
      }
      curr.setDate(curr.getDate() + 1);
    }
    
    this.config.update(c => c ? ({ ...c, deliveryDays: days }) : null);
    this.isModified.set(true);
    this.toastService.success('Periodo gestionado correctamente');
  }

  prevMonth() { this.currentDate.setMonth(this.currentDate.getMonth() - 1); this.generateCalendar(); }
  nextMonth() { this.currentDate.setMonth(this.currentDate.getMonth() + 1); this.generateCalendar(); }

  get currentMonthName(): string {
    return this.currentDate.toLocaleString('es-ES', { month: 'long' });
  }
  get currentYear(): number { return this.currentDate.getFullYear(); }

  // --- Daily Slots Methods ---
  openAddSlot(dayId: string) {
    this.activeDayId.set(dayId);
    this.showAddSlot.set(true);
  }

  addSlot() {
    if (!this.config()) return;
    const dayId = this.activeDayId();
    const slots = [...(this.config()!.dailySlots[dayId] || [])];
    
    // Enforce 30-minute multiples
    const startMins = this.roundTo30(this.timeToMins(this.newSlot.start));
    const endMins = this.roundTo30(this.timeToMins(this.newSlot.end));
    
    if (startMins >= endMins) {
      this.toastService.error('La hora de inicio debe ser anterior a la de fin');
      return;
    }

    const hasOverlap = slots.some(s => {
      const sMins = { start: this.timeToMins(s.start), end: this.timeToMins(s.end) };
      return (startMins < sMins.end && endMins > sMins.start);
    });

    if (hasOverlap) {
      this.toastService.error('El tramo se solapa con uno existente');
      return;
    }

    slots.push({ 
      start: this.minsToTime(startMins), 
      end: this.minsToTime(endMins) 
    });
    slots.sort((a,b) => this.timeToMins(a.start) - this.timeToMins(b.start));
    
    this.config.update(c => {
      if (!c) return null;
      const newDaily = { ...c.dailySlots };
      newDaily[dayId] = slots;
      return { ...c, dailySlots: newDaily };
    });
    this.isModified.set(true);

    this.showAddSlot.set(false);
  }

  roundTo30(mins: number): number {
    return Math.round(mins / 30) * 30;
  }

  minsToTime(totalMin: number): string {
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  }

  removeSlot(dayId: string, index: number) {
    this.config.update(c => {
      if (!c) return null;
      const newDaily = { ...c.dailySlots };
      newDaily[dayId].splice(index, 1);
      return { ...c, dailySlots: newDaily };
    });
    this.isModified.set(true);
  }

  timeToMins(t: string) {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  }

  getDayName(id: string) { return this.weekdays.find(w => w.id === id)?.name || ''; }

  // --- Blocking Rules Methods ---
  getProximityLabel(type: string) {
    const map: any = { near: 'Cerca', medium: 'Media', far: 'Lejos' };
    return map[type] || type;
  }

  // --- Copy Paste Logic ---
  handleCopyClick(dayId: string) {
    const source = this.copySource();
    const targets = [...this.copyTargets()];

    if (!source) {
      // Step 1: Set Source
      this.copySource.set(dayId);
      this.toastService.info('Día de origen copiado. Selecciona los días destino.');
    } else if (source === dayId) {
      // Step 3: Execute Copy
      if (targets.length === 0) {
        this.copySource.set(null);
        return;
      }
      this.executeCopy();
    } else {
      // Step 2: Toggle Targets
      const idx = targets.indexOf(dayId);
      if (idx > -1) {
        targets.splice(idx, 1);
      } else {
        targets.push(dayId);
      }
      this.copyTargets.set(targets);
    }
  }

  getCopyTooltip(dayId: string): string {
    const source = this.copySource();
    if (!source) return 'Copiar tramos de este día';
    if (source === dayId) return 'Pulsa de nuevo para aplicar la copia a los destinos';
    return this.copyTargets().includes(dayId) ? 'Deseleccionar como destino' : 'Seleccionar como destino';
  }

  executeCopy() {
    if (!this.config()) return;
    const sourceId = this.copySource()!;
    const targetIds = this.copyTargets();
    const sourceSlots = this.config()!.dailySlots[sourceId];

    this.config.update(c => {
      if (!c) return null;
      const newDaily = { ...c.dailySlots };
      targetIds.forEach(tId => {
        newDaily[tId] = [...sourceSlots.map(s => ({ ...s }))];
      });
      return { ...c, dailySlots: newDaily };
    });
    this.isModified.set(true);

    this.copySource.set(null);
    this.copyTargets.set([]);
    this.toastService.success(`Horarios copiados a ${targetIds.length} días`);
  }

  // --- Global Actions ---
  async saveConfig() {
    if (!this.config()) return;
    this.loading.set(true);
    try {
      await this.appointmentService.saveConfig(this.config()!);
      this.isModified.set(false);
      this.toastService.success('Configuración de disponibilidad guardada');
    } catch (err) {
      this.toastService.error('Error al guardar la configuración');
    } finally {
      this.loading.set(false);
    }
  }

  async canDeactivate(): Promise<boolean> {
    if (this.isModified()) {
      return await this.confirmService.open({
        title: 'Cambios sin guardar',
        message: 'Tienes cambios pendientes en la configuración de disponibilidad. ¿Estás seguro de que quieres salir sin guardar?',
        confirmText: 'Salir sin guardar',
        cancelText: 'Permanecer aquí',
        type: 'warning'
      });
    }
    return true;
  }
}

