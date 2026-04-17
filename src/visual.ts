import powerbi from "powerbi-visuals-api";
import { buildCalendar } from "./calendar";
import { renderCalendar } from "./renderer";
import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
import ISelectionManager = powerbi.extensibility.ISelectionManager;
import ISelectionId = powerbi.visuals.ISelectionId;
import { CalendarRenderData } from "./interfaces";

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
.cal-dow.sab, .cal-dow.dom { color: #009CDE; }
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
.cal-cell.empty { visibility: hidden; border: none; cursor: default; }
.cal-cell.sab, .cal-cell.dom { border-right: 4px solid #6B7280; }
.cal-cell.selecionado {
    outline: 3px solid #2E4153;
    outline-offset: -2px;
    box-shadow: 0 0 0 3px #2E415355;
}
.cal-cell.desbotado { opacity: 0.35; }
.cal-cell.h1, .cal-cell.h2 { background: #A5D6A7; }
.cal-cell.h1 .cal-val, .cal-cell.h2 .cal-val { color: #3F5C71; }
.cal-cell.h3, .cal-cell.h4 { background: #43A047; }
.cal-cell.h3 .cal-val, .cal-cell.h4 .cal-val { color: #FFFFFF; }
.cal-cell.h5 { background: #1B5E20; }
.cal-cell.h5 .cal-val, .cal-cell.h5 .cal-daynum { color: #FFFFFF; }
.cal-cell.sab.h0, .cal-cell.dom.h0 { background: #F1F3F6; }
.cal-cell:not(.empty):not(.desbotado):hover { filter: brightness(0.95); }
.cal-daynum { font-size: 10px; font-weight: bold; color: #355973; }
.cal-val-wrap { flex: 1; display: flex; align-items: center; justify-content: center; }
.cal-val { font-size: 23px; font-weight: bold; line-height: 1; color: #355973; }
.cal-val.no-value { color: #9aabb8; font-size: 20px; }
`;

function injectStyles(id: string, css: string): void {
    if (document.getElementById(id)) return;
    const style = document.createElement("style");
    style.id = id;
    style.textContent = css;
    document.head.appendChild(style);
}

/** Converte qualquer valor de data do PBI para Date local, sem bug UTC-3 */
function parsePBIDate(value: powerbi.PrimitiveValue): Date | null {
    if (value === null || value === undefined) return null;
    if (value instanceof Date) {
        return new Date(value.getFullYear(), value.getMonth(), value.getDate());
    }
    if (typeof value === "string") {
        const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (match) {
            return new Date(parseInt(match[1]), parseInt(match[2]) - 1, parseInt(match[3]));
        }
    }
    if (typeof value === "number" && value > 31) {
        const d = new Date(new Date(1899, 11, 30).getTime() + Math.floor(value) * 86400000);
        return new Date(d.getFullYear(), d.getMonth(), d.getDate());
    }
    return null;
}

/**
 * Determina o mês/ano a exibir.
 *
 * Ordem de prioridade:
 *  1. Primeira data dos dados recebidos (mais confiável quando há dados)
 *  2. Filtros JSON propagados pelo slicer no dv.metadata
 *  3. Mês atual como último recurso
 */
function getMesAno(dv: powerbi.DataView, datas: Date[]): { ano: number; mes: number } {
    if (datas.length > 0) {
        return { ano: datas[0].getFullYear(), mes: datas[0].getMonth() };
    }
    try {
        const filters: any[] = (dv?.metadata as any)?.filters ?? [];
        let ano: number | null = null;
        let mes: number | null = null;

        for (const f of filters) {
            if (!f?.target?.column || !f?.values?.length) continue;
            const col = String(f.target.column).toLowerCase().trim();
            const v   = f.values[0];

            if ((col === "ano" || col === "year") && Number(v) > 1900) {
                ano = Number(v);
            }
            if ((col === "mês" || col === "mes" || col === "month") && Number(v) >= 1 && Number(v) <= 12) {
                mes = Number(v) - 1;
            }
            // Filtro de intervalo direto na coluna de data
            if (col === "date_cy" || col === "data" || col === "date") {
                const d = parsePBIDate(v);
                if (d) return { ano: d.getFullYear(), mes: d.getMonth() };
            }
        }
        if (ano !== null && mes !== null) return { ano, mes };
        if (ano !== null)                 return { ano, mes: 0 };
    } catch (_) { /* silencioso */ }

    const hoje = new Date();
    return { ano: hoje.getFullYear(), mes: hoje.getMonth() };
}

export class Visual {
    private host;
    private container: HTMLElement;
    private selectionManager: ISelectionManager;

    // Mapa iso → ISelectionId para cada dia que tem dado no PBI
    private selectionIds = new Map<string, ISelectionId>();

    // ISO do dia atualmente selecionado (null = nenhum)
    private selectedIso: string | null = null;

    constructor(options: VisualConstructorOptions) {
        this.host = options.host;
        this.selectionManager = this.host.createSelectionManager();
        injectStyles("calendar-heatmap-styles", CALENDAR_CSS);
        this.container = document.createElement("div");
        this.container.className = "cal-wrap";
        options.element.appendChild(this.container);

        // Clique fora de qualquer célula limpa a seleção
        this.container.addEventListener("click", (e) => {
            if ((e.target as HTMLElement).closest(".cal-cell")) return;
            this.clearSelection();
        });
    }

    public update(options: VisualUpdateOptions) {
        const dv  = options.dataViews?.[0];
        const cat = dv?.categorical?.categories?.[0];
        const val = dv?.categorical?.values?.[0];

        const datas:   Date[]   = [];
        const valores: number[] = [];
        this.selectionIds.clear();

        if (cat?.values?.length) {
            cat.values.forEach((rawDate, i) => {
                const d = parsePBIDate(rawDate);
                if (!d) return;

                const iso = this.toLocalISO(d);
                datas.push(d);
                valores.push(Number(val?.values?.[i]) || 0);

                // Cria o SelectionId vinculado ao ponto de dados original da categoria
                // Isso é o que permite o cross-filtering correto com outros visuais
                const sid = this.host.createSelectionIdBuilder()
                    .withCategory(cat, i)
                    .createSelectionId();
                this.selectionIds.set(iso, sid);
            });
        }

        const { ano, mes } = getMesAno(dv!, datas);
        const calendarData: CalendarRenderData = buildCalendar(datas, valores, ano, mes);

        renderCalendar(
            this.container,
            calendarData,
            this.selectedIso,
            (iso, date) => this.handleDayClick(iso)
        );
    }

    private toLocalISO(d: Date): string {
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    }

    private async handleDayClick(iso: string) {
        const sid = this.selectionIds.get(iso);

        if (this.selectedIso === iso) {
            // Clicou no mesmo dia → deseleciona
            this.selectedIso = null;
            await this.selectionManager.clear();
        } else {
            this.selectedIso = iso;

            if (sid) {
                // Dia com dado: usa SelectionManager → propaga cross-filter para todos os visuais da página
                await this.selectionManager.select(sid, false);
            } else {
                // Dia sem dado: limpa qualquer seleção anterior (não há o que filtrar)
                this.selectedIso = null;
                await this.selectionManager.clear();
                return;
            }
        }

        // Re-renderiza apenas para atualizar a marcação visual da célula selecionada
        // sem precisar reconstruir todo o calendário
        this.updateSelectionStyles();
    }

    private async clearSelection() {
        this.selectedIso = null;
        await this.selectionManager.clear();
        this.updateSelectionStyles();
    }

    /**
     * Atualiza apenas as classes CSS das células sem re-renderizar o HTML inteiro.
     * Isso evita flicker e é muito mais performático.
     */
    private updateSelectionStyles() {
        const cells = this.container.querySelectorAll<HTMLElement>(".cal-cell:not(.empty)");
        const temSelecao = this.selectedIso !== null;

        cells.forEach(cell => {
            const iso = (cell as any)._iso as string | undefined;
            if (!iso) return;

            cell.classList.remove("selecionado", "desbotado");

            if (temSelecao) {
                if (iso === this.selectedIso) {
                    cell.classList.add("selecionado");
                } else {
                    cell.classList.add("desbotado");
                }
            }
        });
    }
}