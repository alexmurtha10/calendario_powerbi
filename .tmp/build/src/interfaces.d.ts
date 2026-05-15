export interface CalendarDay {
    date: Date;
    iso: string;
    value: number;
    week: number;
    holiday?: string;
}
export interface RenderDayData {
    day: number | string;
    heat: string;
    class: string;
    logins: number;
    iso: string;
    holiday?: string;
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
    holidays: HolidayEntry[];
}
export interface HolidayEntry {
    iso: string;
    day: number;
    name: string;
}
