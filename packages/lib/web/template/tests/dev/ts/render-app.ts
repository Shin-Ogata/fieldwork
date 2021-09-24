import { RootPart, render } from '@cdp/template';
import { RenderAppContext } from './interfaces';

let _context: RenderAppContext;

export const setRenderAppContext = (context: RenderAppContext): void => {
    _context = context;
};

export const renderApp = (): RootPart => render(_context(), document.body);
