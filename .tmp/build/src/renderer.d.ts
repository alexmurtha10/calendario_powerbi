import { CalendarRenderData } from "./interfaces";
export declare function renderCalendar(container: HTMLElement, data: CalendarRenderData, selectedDate: string | null, onClick: (iso: string, date: Date) => void): void;
