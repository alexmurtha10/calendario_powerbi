import { CalendarDay, CalendarRenderData, RenderDayData, RenderWeekData } from "./interfaces";

// Helper to get ISO week number
function getISOWeekNumber(d: Date): number {
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    // Set to nearest Thursday: current date + 4 - current day number
    // Make Sunday's day number 7
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    // Get first day of year
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    // Calculate full weeks to nearest Thursday
    const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    return weekNo;
}

export function buildCalendar(datas: Date[], valores: number[]): CalendarRenderData {

    const map = new Map<string, number>();
    datas.forEach((d, i) => {
        const iso = d.toISOString().split("T")[0];
        map.set(iso, valores[i]);
    });

    // If no data is provided, default to current month for display purposes
    let displayDate = new Date();
    if (datas.length > 0) {
        displayDate = datas[0];
    }

    const ano = displayDate.getFullYear();
    const mes = displayDate.getMonth(); // 0-indexed month

    const primeiroDiaMes = new Date(ano, mes, 1);
    const ultimoDiaMes = new Date(ano, mes + 1, 0);
    const totalDiasMes = ultimoDiaMes.getDate();

    // Determine the day of the week for the 1st of the month (0=Sunday, 1=Monday, ..., 6=Saturday)
    // We want Monday to be the first day of the week (0 in our grid)
    // (dayOfWeek + 6) % 7 converts Sunday(0) to 6, Monday(1) to 0, etc.
    const firstDayOfWeekOfMonth = (primeiroDiaMes.getDay() + 6) % 7;

    const allDaysInMonth: CalendarDay[] = [];
    for (let i = 1; i <= totalDiasMes; i++) {
        const data = new Date(ano, mes, i);
        allDaysInMonth.push({
            date: data,
            iso: data.toISOString().split("T")[0],
            value: map.get(data.toISOString().split("T")[0]) || 0,
            week: getISOWeekNumber(data)
        });
    }

    const weeksData: RenderWeekData[] = [];
    let currentWeekDays: RenderDayData[] = [];
    let currentWeekNum: number | null = null;

    // Add empty cells for the beginning of the first week
    for (let i = 0; i < firstDayOfWeekOfMonth; i++) {
        if (currentWeekNum === null) {
            currentWeekNum = getISOWeekNumber(primeiroDiaMes);
        }
        currentWeekDays.push({ day: "", class: "empty", logins: 0, heat: "h0", iso: "" });
    }

    allDaysInMonth.forEach((d) => {
        const dayOfWeek = (d.date.getDay() + 6) % 7; // 0 for Monday, 6 for Sunday

        if (currentWeekNum === null) {
            currentWeekNum = d.week;
        }

        // If it's a new week (Monday) and currentWeekDays is not empty, push the previous week
        if (dayOfWeek === 0 && currentWeekDays.length > 0) {
            weeksData.push({ num: currentWeekNum, days: currentWeekDays });
            currentWeekDays = [];
            currentWeekNum = d.week;
        }

        const today = new Date();
        const isToday = d.date.toDateString() === today.toDateString();
        const isSaturday = d.date.getDay() === 6;
        const isSunday = d.date.getDay() === 0;

        let specialClass = "";
        if (isSaturday) specialClass += " sab";
        if (isSunday) specialClass += " dom";
        if (isToday) specialClass += " hoje";

        currentWeekDays.push({
            day: d.date.getDate(),
            heat: "", // Will be calculated after maxLogins is known
            class: specialClass.trim(),
            logins: d.value,
            iso: d.iso
        });
    });

    // Push the last week
    if (currentWeekDays.length > 0) {
        // Fill remaining empty cells in the last week if any
        while (currentWeekDays.length < 7) {
            currentWeekDays.push({ day: "", class: "empty", logins: 0, heat: "h0", iso: "" });
        }
        if (currentWeekNum !== null) {
            weeksData.push({ num: currentWeekNum, days: currentWeekDays });
        }
    }

    // Calculate heatmap values after all days are processed to get max value
    const allValues = allDaysInMonth.map(d => d.value);
    const maxLogins = allValues.length > 0 ? Math.max(...allValues) : 1;

    weeksData.forEach(week => {
        week.days.forEach(day => {
            if (day.day !== "") {
                const logins = day.logins;
                const pct = logins / maxLogins;

                let heat = "h0";
                if (logins > 0) {
                    if (pct < 0.10) heat = "h1";
                    else if (pct < 0.30) heat = "h2";
                    else if (pct < 0.60) heat = "h3";
                    else if (pct < 0.85) heat = "h4";
                    else heat = "h5";
                }
                day.heat = heat;
            }
        });
    });

    return {
        weeks: weeksData,
        mes_label: primeiroDiaMes.toLocaleString('pt-BR', { month: 'long' }),
        ano: ano,
        total_mes: allDaysInMonth.reduce((acc, d) => acc + d.value, 0)
    };
}