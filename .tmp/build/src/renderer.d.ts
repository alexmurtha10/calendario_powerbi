import { CalendarRenderData } from "./interfaces";
export declare function renderCalendar(container: HTMLElement, data: CalendarRenderData, selectedIso: string | null, onClick: (iso: string, date: Date) => void): void;
