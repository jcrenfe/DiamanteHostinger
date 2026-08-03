import { Component, Input, Output, EventEmitter, inject, signal, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppointmentService } from '../../services/appointment.service';

export interface CalendarDay {
  dateStr: string;
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  available: boolean;
  reason?: string;
  isSelected: boolean;
}

@Component({
  selector: 'app-delivery-calendar',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="delivery-calendar">
      <!-- Calendar Header: Month/Year navigation -->
      <div class="calendar-header">
        <button 
          type="button" 
          class="nav-btn" 
          (click)="prevMonth()" 
          [disabled]="isPrevMonthDisabled() || loading()"
          title="Mes anterior"
        >
          &lt;
        </button>

        <span class="month-title">
          {{ currentMonthName }} {{ currentYear }}
        </span>

        <button 
          type="button" 
          class="nav-btn" 
          (click)="nextMonth()" 
          [disabled]="loading()"
          title="Mes siguiente"
        >
          &gt;
        </button>
      </div>

      <!-- Legend -->
      <div class="calendar-legend">
        <div class="legend-item">
          <span class="dot dot-available"></span>
          <span>Disponible</span>
        </div>
        <div class="legend-item">
          <span class="dot dot-unavailable"></span>
          <span>No disponible / Ocupado</span>
        </div>
      </div>

      <!-- Loading State -->
      <div class="loading-overlay" *ngIf="loading()">
        <span class="spinner"></span>
        <span>Cargando disponibilidad...</span>
      </div>

      <!-- Calendar Grid -->
      <div class="calendar-grid" [class.is-loading]="loading()">
        <div class="weekday-header" *ngFor="let name of weekDayNames">{{ name }}</div>

        <div 
          *ngFor="let day of calendarDays()"
          class="day-cell"
          [class.not-current]="!day.isCurrentMonth"
          [class.available]="day.isCurrentMonth && day.available"
          [class.unavailable]="day.isCurrentMonth && !day.available"
          [class.selected]="day.isCurrentMonth && day.isSelected"
          [class.today]="day.isToday"
          [attr.title]="getDayTooltip(day)"
          (click)="handleDayClick(day)"
        >
          <span class="day-number">{{ day.dayNumber }}</span>
          <span class="status-indicator" *ngIf="day.isCurrentMonth">
            {{ day.available ? '✓' : '✕' }}
          </span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .delivery-calendar {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 1.25rem;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
      user-select: none;
      position: relative;
    }

    .calendar-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
    }

    .month-title {
      font-weight: 700;
      font-size: 1.05rem;
      color: var(--primary, #4a1525);
      text-transform: capitalize;
    }

    .nav-btn {
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      width: 34px;
      height: 34px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      font-size: 1.1rem;
      color: var(--primary, #4a1525);
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .nav-btn:hover:not(:disabled) {
      background: #e2e8f0;
      border-color: #94a3b8;
    }

    .nav-btn:disabled {
      opacity: 0.3;
      cursor: not-allowed;
    }

    .calendar-legend {
      display: flex;
      gap: 1.25rem;
      justify-content: center;
      margin-bottom: 1rem;
      font-size: 0.8rem;
      color: #64748b;
    }

    .legend-item {
      display: flex;
      align-items: center;
      gap: 0.4rem;
    }

    .dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      display: inline-block;
    }

    .dot-available {
      background-color: #22c55e;
      box-shadow: 0 0 4px rgba(34, 197, 94, 0.4);
    }

    .dot-unavailable {
      background-color: #cbd5e1;
    }

    .loading-overlay {
      position: absolute;
      inset: 0;
      background: rgba(255, 255, 255, 0.85);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      z-index: 10;
      border-radius: 12px;
      font-size: 0.85rem;
      font-weight: 600;
      color: var(--primary, #4a1525);
    }

    .spinner {
      width: 24px;
      height: 24px;
      border: 3px solid #f3f3f3;
      border-top: 3px solid var(--secondary, #d97706);
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    .calendar-grid {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      gap: 6px;
      transition: opacity 0.2s ease;
    }

    .calendar-grid.is-loading {
      opacity: 0.4;
    }

    .weekday-header {
      text-align: center;
      font-size: 0.75rem;
      font-weight: 700;
      color: #64748b;
      padding-bottom: 0.4rem;
    }

    .day-cell {
      min-height: 48px;
      padding: 0.3rem;
      border-radius: 8px;
      border: 1px solid transparent;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: space-between;
      transition: all 0.2s ease;
      position: relative;
    }

    .day-number {
      font-size: 0.9rem;
      font-weight: 600;
    }

    .status-indicator {
      font-size: 0.65rem;
      font-weight: bold;
      line-height: 1;
    }

    /* Styles by status */
    .day-cell.not-current {
      opacity: 0;
      pointer-events: none;
    }

    .day-cell.available {
      background-color: #f0fdf4;
      border-color: #86efac;
      color: #166534;
      cursor: pointer;
    }

    .day-cell.available:hover {
      background-color: #dcfce7;
      border-color: #22c55e;
      transform: translateY(-2px);
      box-shadow: 0 4px 6px -1px rgba(34, 197, 94, 0.2);
    }

    .day-cell.unavailable {
      background-color: #f8fafc;
      border-color: #e2e8f0;
      color: #94a3b8;
      cursor: not-allowed;
      opacity: 0.65;
    }

    .day-cell.unavailable .status-indicator {
      color: #ef4444;
    }

    .day-cell.selected {
      background-color: var(--primary, #4a1525) !important;
      border-color: var(--primary, #4a1525) !important;
      color: #ffffff !important;
      box-shadow: 0 4px 10px rgba(74, 21, 37, 0.3) !important;
      transform: scale(1.03);
    }

    .day-cell.selected .status-indicator {
      color: #ffffff !important;
    }

    .day-cell.today {
      outline: 2px solid var(--secondary, #d97706);
      outline-offset: -2px;
    }
  `]
})
export class DeliveryCalendarComponent implements OnInit, OnChanges {
  private appointmentService = inject(AppointmentService);

  @Input() selectedDate: string = '';
  @Output() dateSelected = new EventEmitter<string>();

  viewDate = new Date();
  weekDayNames = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

  loading = signal(false);
  availabilityMap = signal<Record<string, { available: boolean; reason?: string }>>({});
  calendarDays = signal<CalendarDay[]>([]);

  ngOnInit() {
    this.loadMonthAvailability();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['selectedDate']) {
      this.rebuildCalendarDays();
    }
  }

  get currentMonthName(): string {
    return this.viewDate.toLocaleString('es-ES', { month: 'long' });
  }

  get currentYear(): number {
    return this.viewDate.getFullYear();
  }

  isPrevMonthDisabled(): boolean {
    const now = new Date();
    return (
      this.viewDate.getFullYear() < now.getFullYear() ||
      (this.viewDate.getFullYear() === now.getFullYear() && this.viewDate.getMonth() <= now.getMonth())
    );
  }

  prevMonth() {
    if (this.isPrevMonthDisabled()) return;
    this.viewDate = new Date(this.viewDate.getFullYear(), this.viewDate.getMonth() - 1, 1);
    this.loadMonthAvailability();
  }

  nextMonth() {
    this.viewDate = new Date(this.viewDate.getFullYear(), this.viewDate.getMonth() + 1, 1);
    this.loadMonthAvailability();
  }

  async loadMonthAvailability() {
    this.loading.set(true);
    try {
      const year = this.viewDate.getFullYear();
      const month = this.viewDate.getMonth(); // 0-indexed
      const map = await this.appointmentService.getMonthAvailability(year, month);
      this.availabilityMap.set(map);
      this.rebuildCalendarDays();
    } catch (err) {
    } finally {
      this.loading.set(false);
    }
  }

  rebuildCalendarDays() {
    const year = this.viewDate.getFullYear();
    const month = this.viewDate.getMonth();
    const pad = (n: number) => n.toString().padStart(2, '0');

    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    const totalDays = lastDayOfMonth.getDate();

    // JS getDay(): 0 = Sun, 1 = Mon ... Convert to Monday-first (0 = Mon, 6 = Sun)
    let startingDayOfWeek = firstDayOfMonth.getDay() - 1;
    if (startingDayOfWeek === -1) startingDayOfWeek = 6;

    const days: CalendarDay[] = [];
    const map = this.availabilityMap();
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

    // Add empty placeholder cells for previous month padding
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push({
        dateStr: '',
        dayNumber: 0,
        isCurrentMonth: false,
        isToday: false,
        available: false,
        isSelected: false
      });
    }

    // Add actual days of current month
    for (let d = 1; d <= totalDays; d++) {
      const dateStr = `${year}-${pad(month + 1)}-${pad(d)}`;
      const availInfo = map[dateStr] || { available: false, reason: 'Cargando' };

      days.push({
        dateStr,
        dayNumber: d,
        isCurrentMonth: true,
        isToday: dateStr === todayStr,
        available: availInfo.available,
        reason: availInfo.reason,
        isSelected: this.selectedDate === dateStr
      });
    }

    this.calendarDays.set(days);
  }

  getDayTooltip(day: CalendarDay): string {
    if (!day.isCurrentMonth) return '';
    if (day.isSelected) return 'Día de entrega seleccionado';
    if (day.available) return 'Día disponible para entrega';
    return day.reason || 'No disponible para reparto';
  }

  handleDayClick(day: CalendarDay) {
    if (!day.isCurrentMonth || !day.available) return;
    this.dateSelected.emit(day.dateStr);
  }
}
