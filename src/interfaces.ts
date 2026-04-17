export interface CalendarDay {
    date: Date;
    iso: string;
    value: number;
    week: number;
}

// New interfaces for the structured data returned by buildCalendar
export interface RenderDayData {
    day: number | string; // Can be empty string for empty cells
    heat: string;
    class: string; // "sab", "dom", "hoje", "empty"
    logins: number; // The actual value
    iso: string;
}

export interface RenderWeekData {
    num: number; // Week number
    days: RenderDayData[];
}

export interface CalendarRenderData {
    weeks: RenderWeekData[];
    mes_label: string;
    ano: number;
    total_mes: number;
}
