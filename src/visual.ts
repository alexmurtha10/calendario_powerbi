import powerbi from "powerbi-visuals-api";
import { buildCalendar } from "./calendar";
import { renderCalendar } from "./renderer";
import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
import { CalendarRenderData } from "./interfaces";

// ✅ CSS injetado diretamente via JS — garante que os estilos sempre sejam aplicados
// mesmo que o pipeline do pbiviz não compile o LESS corretamente
const CALENDAR_CSS = `
.cal-wrap {
    font-family: Calibri, sans-serif;
    padding: 12px;
    background: #f7f7f7;
    color: #3F5C71;
    box-sizing: border-box;
    height: 100%;
    overflow: auto;
}

.cal-header-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;
    flex-wrap: wrap;
    gap: 6px;
}

.cal-title {
    font-size: 15px;
    font-weight: bold;
    color: #3F5C71;
}
.cal-title span {
    font-weight: normal;
    text-transform: capitalize;
}

.cal-legend {
    display: flex;
    gap: 10px;
    font-size: 10px;
    color: #6b7280;
    align-items: center;
    flex-wrap: wrap;
}

.cal-legend-dot {
    width: 10px;
    height: 10px;
    border-radius: 2px;
    display: inline-block;
    margin-right: 3px;
    vertical-align: middle;
}

.cal-legend-total {
    color: #3F5C71;
    margin-left: 8px;
}

.cal-grid {
    display: grid;
    grid-template-columns: 32px repeat(7, 1fr);
    gap: 3px;
}

.cal-dow {
    background: #2E4153;
    border-radius: 6px;
    text-align: center;
    padding: 7px 2px;
    font-size: 13px;
    font-weight: bold;
    text-transform: uppercase;
    color: #FFFFFF;
}
.cal-dow.sab,
.cal-dow.dom {
    color: #009CDE;
}

.cal-corner {
    display: flex;
    align-items: flex-end;
    justify-content: center;
    padding-bottom: 4px;
    font-size: 9px;
    font-weight: bold;
    text-transform: uppercase;
    color: #3F5C71;
}

.cal-weeknum {
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 9px;
    font-weight: bold;
    height: 70px;
    color: #3F5C71;
}

.cal-cell {
    background: #FFFFFF;
    border: 1px solid #bbbcbc;
    border-radius: 7px;
    padding: 5px;
    min-height: 70px;
    display: flex;
    flex-direction: column;
    position: relative;
    cursor: pointer;
    transition: all 0.1s;
    box-sizing: border-box;
}
.cal-cell.empty {
    visibility: hidden;
    border: none;
    cursor: default;
}
.cal-cell.sab,
.cal-cell.dom {
    border-right: 4px solid #6B7280;
}
.cal-cell.selecionado {
    outline: 3px solid #2E4153;
    outline-offset: -2px;
}
.cal-cell.h1,
.cal-cell.h2 {
    background: #A5D6A7;
}
.cal-cell.h1 .cal-val,
.cal-cell.h2 .cal-val {
    color: #3F5C71;
}
.cal-cell.h3,
.cal-cell.h4 {
    background: #43A047;
}
.cal-cell.h3 .cal-val,
.cal-cell.h4 .cal-val {
    color: #FFFFFF;
}
.cal-cell.h5 {
    background: #1B5E20;
}
.cal-cell.h5 .cal-val,
.cal-cell.h5 .cal-daynum {
    color: #FFFFFF;
}
.cal-cell.sab.h0,
.cal-cell.dom.h0 {
    background: #F1F3F6;
}
.cal-cell:not(.empty):hover {
    filter: brightness(0.95);
}

.cal-daynum {
    font-size: 10px;
    font-weight: bold;
    color: #355973;
}

.cal-val-wrap {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
}

.cal-val {
    font-size: 23px;
    font-weight: bold;
    line-height: 1;
    color: #355973;
}
.cal-val.no-value {
    color: #9aabb8;
    font-size: 20px;
}
`;

function injectStyles(id: string, css: string): void {
    // Evita duplicar a tag <style> a cada update
    if (document.getElementById(id)) return;
    const style = document.createElement("style");
    style.id = id;
    style.textContent = css;
    document.head.appendChild(style);
}

export class Visual {
    private host;
    private container: HTMLElement;
    private selectedDate: string | null = null;

    constructor(options: VisualConstructorOptions) {
        this.host = options.host;

        // ✅ Injeta o CSS uma única vez no <head>
        injectStyles("calendar-heatmap-styles", CALENDAR_CSS);

        this.container = document.createElement("div");
        this.container.className = "cal-wrap";
        options.element.appendChild(this.container);
    }

    public update(options: VisualUpdateOptions) {
        const dv = options.dataViews?.[0];
        const cat = dv?.categorical?.categories?.[0];
        const val = dv?.categorical?.values?.[0];

        if (!cat || !val || !cat.values || !val.values || cat.values.length === 0) {
            this.container.innerHTML = "<div style='padding:16px;color:#3F5C71;font-family:Calibri,sans-serif;'>Nenhum dado para exibir. Adicione campos de Data e Valor.</div>";
            return;
        }

        const datas = cat.values.map(d => new Date(d as any));
        const valores = val.values.map(v => Number(v));

        const calendarData: CalendarRenderData = buildCalendar(datas, valores);

        renderCalendar(
            this.container,
            calendarData,
            this.selectedDate,
            (iso, date) => this.handleClick(iso, date)
        );
    }

    private handleClick(iso: string, date: Date) {
        if (this.selectedDate === iso) {
            this.selectedDate = null;
            this.host.applyJsonFilter(null as any, "general", "filter", 2 as any);
        } else {
            this.selectedDate = iso;

            const inicio = new Date(date);
            inicio.setHours(0, 0, 0, 0);

            const fim = new Date(date);
            fim.setHours(23, 59, 59, 999);

            const filter = {
                $schema: "http://powerbi.com/product/schema#advanced",
                target: {
                    table: "DIMENSAO_TEMPO",
                    column: "DATE_CY"
                },
                logicalOperator: "And",
                conditions: [
                    { operator: "GreaterThanOrEqual", value: inicio },
                    { operator: "LessThanOrEqual", value: fim }
                ]
            };
            this.host.applyJsonFilter(filter as any, "general", "filter", 1 as any);
        }
    }
}