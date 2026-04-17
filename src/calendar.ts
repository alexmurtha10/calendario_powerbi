import { CalendarDay, CalendarRenderData, RenderDayData, RenderWeekData } from "./interfaces";

// Helper to get ISO week number
function getISOWeekNumber(d: Date): number {
    const utc = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    utc.setUTCDate(utc.getUTCDate() + 4 - (utc.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1));
    return Math.ceil((((utc.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

/**
 * ✅ CORREÇÃO CRÍTICA — Fuso horário (UTC-3 Brasil)
 *
 * Problema original:
 *   new Date(ano, mes, i)  → cria em horário LOCAL (ex: 2026-04-01 00:00 BRT)
 *   .toISOString()         → converte para UTC  (ex: 2026-03-31T03:00:00Z)
 *   .split("T")[0]         → retorna "2026-03-31"  ← DIA ERRADO!
 *
 * As datas vindas do Power BI também sofrem o mesmo problema:
 *   new Date("2026-04-01T00:00:00.000Z") → em BRT fica 2026-03-31 21:00
 *   .toISOString() → "2026-03-31T..."  ← não casa com a chave do map!
 *
 * Solução: usar sempre ano/mês/dia LOCAL via getFullYear/getMonth/getDate,
 * e formatar a chave ISO manualmente sem passar por UTC.
 */
function toLocalISO(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
}

export function buildCalendar(datas: Date[], valores: number[]): CalendarRenderData {

    // ✅ Monta o map usando a data LOCAL (não UTC)
    const map = new Map<string, number>();
    datas.forEach((d, i) => {
        const iso = toLocalISO(d);
        // Acumula valores caso haja múltiplas linhas para o mesmo dia
        map.set(iso, (map.get(iso) ?? 0) + (Number(valores[i]) || 0));
    });

    // Determina o mês/ano a partir da primeira data recebida
    let displayDate = new Date();
    if (datas.length > 0) {
        displayDate = datas[0];
    }

    // ✅ Usa getFullYear/getMonth LOCAL — não UTC
    const ano = displayDate.getFullYear();
    const mes = displayDate.getMonth();

    const primeiroDiaMes = new Date(ano, mes, 1);
    const ultimoDiaMes   = new Date(ano, mes + 1, 0);
    const totalDiasMes   = ultimoDiaMes.getDate();

    // (dayOfWeek + 6) % 7 → Segunda = 0, ..., Domingo = 6
    const firstDayOfWeekOfMonth = (primeiroDiaMes.getDay() + 6) % 7;

    // ✅ Monta os dias do mês usando toLocalISO — mesma chave do map
    const allDaysInMonth: CalendarDay[] = [];
    for (let i = 1; i <= totalDiasMes; i++) {
        const data = new Date(ano, mes, i);
        const iso  = toLocalISO(data);
        allDaysInMonth.push({
            date:  data,
            iso:   iso,
            value: map.get(iso) ?? 0,
            week:  getISOWeekNumber(data)
        });
    }

    // --- Monta as semanas ---
    const weeksData: RenderWeekData[] = [];
    let currentWeekDays: RenderDayData[] = [];
    let currentWeekNum: number | null = null;

    // Células vazias antes do dia 1
    for (let i = 0; i < firstDayOfWeekOfMonth; i++) {
        if (currentWeekNum === null) {
            currentWeekNum = getISOWeekNumber(primeiroDiaMes);
        }
        currentWeekDays.push({ day: "", class: "empty", logins: 0, heat: "h0", iso: "" });
    }

    const today = new Date();
    const todayISO = toLocalISO(today);

    allDaysInMonth.forEach((d) => {
        const dayOfWeek = (d.date.getDay() + 6) % 7; // 0=Seg … 6=Dom

        if (currentWeekNum === null) {
            currentWeekNum = d.week;
        }

        // Virou segunda-feira: fecha a semana anterior
        if (dayOfWeek === 0 && currentWeekDays.length > 0) {
            weeksData.push({ num: currentWeekNum, days: currentWeekDays });
            currentWeekDays = [];
            currentWeekNum = d.week;
        }

        const isSaturday = d.date.getDay() === 6;
        const isSunday   = d.date.getDay() === 0;
        const isToday    = d.iso === todayISO;

        let specialClass = "";
        if (isSaturday) specialClass += " sab";
        if (isSunday)   specialClass += " dom";
        if (isToday)    specialClass += " hoje";

        currentWeekDays.push({
            day:    d.date.getDate(),
            heat:   "",            // calculado depois
            class:  specialClass.trim(),
            logins: d.value,
            iso:    d.iso
        });
    });

    // Fecha a última semana
    if (currentWeekDays.length > 0) {
        while (currentWeekDays.length < 7) {
            currentWeekDays.push({ day: "", class: "empty", logins: 0, heat: "h0", iso: "" });
        }
        if (currentWeekNum !== null) {
            weeksData.push({ num: currentWeekNum, days: currentWeekDays });
        }
    }

    // --- Calcula heatmap após conhecer o valor máximo ---
    const allValues = allDaysInMonth.map(d => d.value);
    const maxLogins = allValues.length > 0 ? Math.max(...allValues) : 1;

    weeksData.forEach(week => {
        week.days.forEach(day => {
            if (day.day !== "") {
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
            }
        });
    });

    return {
        weeks:      weeksData,
        mes_label:  primeiroDiaMes.toLocaleString("pt-BR", { month: "long" }),
        ano:        ano,
        total_mes:  allDaysInMonth.reduce((acc, d) => acc + d.value, 0)
    };
}