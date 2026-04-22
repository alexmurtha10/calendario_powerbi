import { CalendarRenderData } from "./interfaces";

export function renderCalendar(
    container: HTMLElement,
    data: CalendarRenderData,
    selectedIso: string | null,
    onClick: (iso: string, date: Date) => void
) {
    container.innerHTML = "";

    const { weeks, mes_label, ano, total_mes } = data;

    // --- HEADER ---
    const topBar = document.createElement("div");
    topBar.className = "cal-header-bar";
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

    // --- GRID ---
    const grid = document.createElement("div");
    grid.className = "cal-grid";

    grid.insertAdjacentHTML("beforeend", `
        <div class='cal-corner'>Sem</div>
        <div class='cal-dow util'>Seg</div>
        <div class='cal-dow util'>Ter</div>
        <div class='cal-dow util'>Qua</div>
        <div class='cal-dow util'>Qui</div>
        <div class='cal-dow util'>Sex</div>
        <div class='cal-dow sab'>Sáb</div>
        <div class='cal-dow dom'>Dom</div>
    `);

    const temSelecao = selectedIso !== null;

    weeks.forEach(week => {
        // Número da semana
        const weekNumEl = document.createElement("div");
        weekNumEl.className = "cal-weeknum";
        weekNumEl.innerText = week.num.toString();
        grid.appendChild(weekNumEl);

        week.days.forEach(day => {
            const cell = document.createElement("div");

            const extraClass = day.class ? day.class.trim() : "";
            const classes = ["cal-cell", day.heat, extraClass].filter(Boolean);

            if (day.day !== "") {
                // ✅ Guarda o ISO na propriedade do elemento DOM
                // Isso permite que updateSelectionStyles() funcione sem re-renderizar
                (cell as any)._iso = day.iso;

                if (temSelecao) {
                    if (day.iso === selectedIso) {
                        classes.push("selecionado");
                    } else {
                        classes.push("desbotado");
                    }
                }

                cell.className = classes.join(" ");

                const displayVal = day.logins > 0
                    ? `<span class="cal-val">${day.logins}</span>`
                    : `<span class="cal-val no-value">—</span>`;

                cell.innerHTML = `
                    <span class="cal-daynum">${day.day}</span>
                    <div class="cal-val-wrap">${displayVal}</div>
                `;

                cell.addEventListener("click", (e) => {
                    e.stopPropagation(); // evita disparar o listener do container
                    onClick(day.iso, new Date(day.iso + "T12:00:00"));
                });

            } else {
                // Célula vazia (padding do início/fim do mês)
                cell.className = classes.join(" ");
                cell.innerHTML = "";
            }

            grid.appendChild(cell);
        });
    });

    // Define grid-template-rows: primeira linha (header) fixa, demais expandem igual
    const numWeeks = data.weeks.length;
    grid.style.gridTemplateRows = `auto repeat(${numWeeks}, 1fr)`;

    container.appendChild(grid);
}