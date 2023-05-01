export interface IHookStateContext<H = unknown> {
    host: H;
    update: VoidFunction;
}
