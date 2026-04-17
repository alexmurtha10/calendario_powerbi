import { CalendarDay, CalendarRenderData, RenderDayData, RenderWeekData } from "./interfaces";

function getISOWeekNumber(d: Date): number {
    const utc = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    utc.setUTCDate(utc.getUTCDate() + 4 - (utc.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1));
    return Math.ceil((((utc.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

function toLocalISO(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function buildCalendar(
    datas: Date[],
    valores: number[],
    ano: number,
    mes: number
): CalendarRenderData {

    // Mapa ISO → valor acumulado
    const map = new Map<string, number>();
    datas.forEach((d, i) => {
        const iso = toLocalISO(d);
        map.set(iso, (map.get(iso) ?? 0) + (Number(valores[i]) || 0));
    });

    const primeiroDiaMes = new Date(ano, mes, 1);
    const totalDiasMes   = new Date(ano, mes + 1, 0).getDate();

    // Dia da semana do dia 1: Segunda=0 … Domingo=6
    const firstDayOfWeekOfMonth = (primeiroDiaMes.getDay() + 6) % 7;

    const todayISO = toLocalISO(new Date());

    // Gera todos os dias do mês com seus valores (0 se sem dado)
    const allDaysInMonth: CalendarDay[] = [];
    for (let i = 1; i <= totalDiasMes; i++) {
        const data = new Date(ano, mes, i);
        const iso  = toLocalISO(data);
        allDaysInMonth.push({
            date:  data,
            iso,
            value: map.get(iso) ?? 0,
            week:  getISOWeekNumber(data)
        });
    }

    // Monta semanas
    const weeksData: RenderWeekData[] = [];
    let currentWeekDays: RenderDayData[] = [];
    let currentWeekNum: number | null = null;

    // Células vazias antes do dia 1
    for (let i = 0; i < firstDayOfWeekOfMonth; i++) {
        if (currentWeekNum === null) currentWeekNum = getISOWeekNumber(primeiroDiaMes);
        currentWeekDays.push({ day: "", class: "empty", logins: 0, heat: "h0", iso: "" });
    }

    allDaysInMonth.forEach(d => {
        const dayOfWeek = (d.date.getDay() + 6) % 7; // 0=Seg … 6=Dom

        if (currentWeekNum === null) currentWeekNum = d.week;

        // Virou segunda → fecha semana anterior
        if (dayOfWeek === 0 && currentWeekDays.length > 0) {
            weeksData.push({ num: currentWeekNum, days: currentWeekDays });
            currentWeekDays = [];
            currentWeekNum  = d.week;
        }

        let cls = "";
        if (d.date.getDay() === 6) cls += " sab";
        if (d.date.getDay() === 0) cls += " dom";
        if (d.iso === todayISO)    cls += " hoje";

        currentWeekDays.push({
            day:    d.date.getDate(),
            heat:   "",           // calculado depois
            class:  cls.trim(),
            logins: d.value,
            iso:    d.iso
        });
    });

    // Fecha última semana preenchendo com células vazias
    if (currentWeekDays.length > 0) {
        while (currentWeekDays.length < 7) {
            currentWeekDays.push({ day: "", class: "empty", logins: 0, heat: "h0", iso: "" });
        }
        if (currentWeekNum !== null) weeksData.push({ num: currentWeekNum, days: currentWeekDays });
    }

    // Calcula heatmap
    const maxLogins = Math.max(...allDaysInMonth.map(d => d.value), 1);

    weeksData.forEach(week => {
        week.days.forEach(day => {
            if (day.day === "") return;
            const pct = day.logins / maxLogins;
            let heat = "h0";
            if (day.logins > 0) {
                if      (pct < 0.10) heat = "h1";
                else if (pct < 0.30) heat = "h2";
                else if (pct < 0.60) heat = "h3";
                else if (pct < 0.85) heat = "h4";
                else                 heat = "h5";
            }
            day.heat = heat;
        });
    });

    return {
        weeks:     weeksData,
        mes_label: primeiroDiaMes.toLocaleString("pt-BR", { month: "long" }),
        ano,
        total_mes: allDaysInMonth.reduce((acc, d) => acc + d.value, 0)
    };
}