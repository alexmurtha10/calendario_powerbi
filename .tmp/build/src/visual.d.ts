import powerbi from "powerbi-visuals-api";
import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
export declare class Visual {
    private host;
    private container;
    private selectedDate;
    constructor(options: VisualConstructorOptions);
    update(options: VisualUpdateOptions): void;
    private handleClick;
}
