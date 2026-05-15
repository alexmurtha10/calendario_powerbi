export interface CalendarDay {
    date: Date;
    iso: string;
    value: number;
    week: number;
    holiday?: string; // Nome do feriado (DESCRICAO_FERIADO)
}

export interface RenderDayData {
    day: number | string;
    heat: string;
    class: string; // "sab", "dom", "hoje", "empty", "feriado"
    logins: number;
    iso: string;
    holiday?: string; // Nome do feriado, se houver
}

export interface RenderWeekData {
    num: number;
    days: RenderDayData[];
}

export interface CalendarRenderData {
    weeks: RenderWeekData[];
    mes_label: string;
    ano: number;
    total_mes: number;
    holidays: HolidayEntry[]; // Lista de feriados do mês
}

export interface HolidayEntry {
    iso: string;
    day: number;
    name: string;
}