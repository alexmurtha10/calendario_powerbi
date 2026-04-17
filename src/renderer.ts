import { CalendarRenderData } from "./interfaces";

export function renderCalendar(
    container: HTMLElement,
    data: CalendarRenderData,
    selectedDate: string | null,
    onClick: (iso: string, date: Date) => void
) {
    container.innerHTML = "";

    const { weeks, mes_label, ano, total_mes } = data;

    // --- BARRA SUPERIOR (TÍTULO, LEGENDA E TOTAL) ---
    const topBar = document.createElement("div");
    topBar.className = "cal-header-bar"; // ✅ Corrigido: era "cal-header", não existe no LESS
    topBar.innerHTML = `
        <div class="cal-title">
            📅 Registro de Frequência — <span>${mes_label} / ${ano}</span>
        </div>
        <div class="cal-legend">
            <span><span class="cal-legend-dot" style="background:#FFFFFF;border:1px solid #bbbcbc;"></span>Sem dados</span>
            <span><span class="cal-legend-dot" style="background:#A5D6A7;"></span>Baixo</span>
            <span><span class="cal-legend-dot" style="background:#43A047;"></span>Médio</span>
            <span><span class="cal-legend-dot" style="background:#1B5E20;"></span>Alto</span>
            <span class="cal-legend-total">Total: <b>${total_mes}</b></span>
        </div>
    `;
    container.appendChild(topBar);

    const grid = document.createElement("div");
    grid.className = "cal-grid";

    // --- CABEÇALHO DO GRID ---
    // ✅ Corrigido: adicionada classe "util" nos dias úteis para receber cor branca via LESS
    const headerHTML = `
        <div class='cal-corner'>Sem</div>
        <div class='cal-dow util'>Seg</div>
        <div class='cal-dow util'>Ter</div>
        <div class='cal-dow util'>Qua</div>
        <div class='cal-dow util'>Qui</div>
        <div class='cal-dow util'>Sex</div>
        <div class='cal-dow sab'>Sáb</div>
        <div class='cal-dow dom'>Dom</div>
    `;
    grid.insertAdjacentHTML("beforeend", headerHTML);

    // --- RENDERIZAÇÃO DOS DIAS ---
    weeks.forEach(week => {
        const weekNumEl = document.createElement("div");
        weekNumEl.className = "cal-weeknum";
        weekNumEl.innerText = week.num.toString();
        grid.appendChild(weekNumEl);

        week.days.forEach(day => {
            const cell = document.createElement("div");

            // ✅ Corrigido: montagem limpa da classe, sem espaços extras quando class está vazio
            const extraClass = day.class ? day.class.trim() : "";
            cell.className = ["cal-cell", day.heat, extraClass]
                .filter(Boolean)
                .join(" ");

            if (day.iso === selectedDate) {
                cell.classList.add("selecionado");
            }

            if (day.day !== "") {
                // ✅ Corrigido: células com valor 0 mostram "—" (em vez de mostrar 0)
                const displayVal = day.logins > 0
                    ? `<span class="cal-val">${day.logins}</span>`
                    : `<span class="cal-val no-value">—</span>`;

                cell.innerHTML = `
                    <span class="cal-daynum">${day.day}</span>
                    <div class="cal-val-wrap">${displayVal}</div>
                `;

                cell.onclick = () => {
                    onClick(day.iso, new Date(day.iso + "T12:00:00")); // ✅ Evita problema de fuso horário
                };
            } else {
                // Célula vazia — sem conteúdo interno
                cell.innerHTML = "";
            }

            grid.appendChild(cell);
        });
    });

    container.appendChild(grid);
}