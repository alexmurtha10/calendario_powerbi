import powerbi from "powerbi-visuals-api";
import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
export declare class Visual {
    private host;
    private container;
    private selectionManager;
    private selectionIds;
    private selectedIso;
    constructor(options: VisualConstructorOptions);
    update(options: VisualUpdateOptions): void;
    private toLocalISO;
    private handleDayClick;
    private clearSelection;
    /**
     * Atualiza apenas as classes CSS das células sem re-renderizar o HTML inteiro.
     * Isso evita flicker e é muito mais performático.
     */
    private updateSelectionStyles;
}
