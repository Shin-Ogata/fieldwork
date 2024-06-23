import { path2regexp, toRouterPath } from '@cdp/router';

describe('router/utils spec', () => {

    it('check path2regexp', () => {
        expect(path2regexp).toBeDefined();
        expect(path2regexp.compile).toBeDefined();
        expect(path2regexp.match).toBeDefined();
        expect(path2regexp.parse).toBeDefined();
        expect(path2regexp.pathToRegexp).toBeDefined();
    });

    it('check toRouterPath', () => {
        let id = toRouterPath('http://localhost:8080/.temp/dev/#/view');
        expect(id).toBe('/view');
        id = toRouterPath('http://localhost:8080/.temp/dev/#/view?param=hoge');
        expect(id).toBe('/view?param=hoge');
        id = toRouterPath('http://localhost:8080/.temp/dev/#/view/hoge/');
        expect(id).toBe('/view/hoge');
        id = toRouterPath('/view/fuga');
        expect(id).toBe('/view/fuga');
        id = toRouterPath('view/foo');
        expect(id).toBe('/view/foo');
        id = toRouterPath('three');
        expect(id).toBe('/three');
        id = toRouterPath('#three');
        expect(id).toBe('/three');
        id = toRouterPath('#three/hoge/');
        expect(id).toBe('/three/hoge');
        id = toRouterPath('');
        expect(id).toBe('/');
        id = toRouterPath('/');
        expect(id).toBe('/');
    });
});
