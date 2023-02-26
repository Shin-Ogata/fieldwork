import { RootPart, render } from '@cdp/template';
import { RenderContext } from './interfaces';

let _context: RenderContext;
let _el: HTMLElement;

export const setRenderContext = (context: RenderContext, el: HTMLElement): void => {
    _context = context;
    _el      = el;
};

export const renderTodos = (): RootPart => render(_context(), _el);
