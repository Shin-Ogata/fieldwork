import {
    i18n,
    initializeI18N,
    localize,
} from '@cdp/i18n';
import { dom as $ } from '@cdp/dom';
import {
    ensureCleanI18N,
    cleanupTestElements,
    prepareTestElements,
} from './tools';

describe('i18n/plugin/dom-localizer spec', () => {
    beforeEach(async ()  => {
        ensureCleanI18N();
        await initializeI18N({
            lng: 'ja',
            load: 'languageOnly',
            fallbackLng: 'ja',
            namespace: 'messages',
            resourcePath: '../res/i18n/locales/{{ns}}.{{lng}}.json',
            fallbackResources: { 'ja': 'ja-JP' },
        });
    });

    afterEach((): void => {
        cleanupTestElements();
    });

    it('check instance', async () => {
        await initializeI18N();
        expect(localize).toBeDefined();
        expect($().localize).toBeDefined();
    });

    it('check translate an element', () => {
        $(prepareTestElements())
            .append(`
                <a id="testee" href="#" data-i18n="app.common.transfer"></a>
            `);
        const $test = $('#testee');

        $test.localize();
        expect($test.text()).toBe('送信');
    });

    it('check translate children of an element', () => {
        $(prepareTestElements())
            .append(`
                <ul id="testee">
                    <li><a href="#" data-i18n="app.common.back"></a></li>
                    <li><a href="#" data-i18n="app.common.next"></a></li>
                    <li><a href="#" data-i18n="app.common.done"></a></li>
                </ul>
            `);
        const $test = $('#testee');

        $test.localize();

        const $li = $test.children();
        expect($li[0].textContent).toBe('戻る');
        expect($li[1].textContent).toBe('次へ');
        expect($li[2].textContent).toBe('完了');
    });

    it('check translate some inner element', () => {
        $(prepareTestElements())
            .append(`
                <div id="testee" data-i18n="app.common.refresh" data-i18n-target=".inner">
                    <input class="inner" type="text"></input>
                </div>
            `);
        const $test = $('#testee');

        $test.localize();

        const $inner = $test.find('.inner');
        expect($inner.text()).toBe('更新');
    });

    it('check set different attribute', () => {
        $(prepareTestElements())
            .append(`
                <a id="testee" href="#" data-i18n="[title]app.common.cancel"></a>
            `);
        const $test = $('#testee');

        $test.localize();

        expect($test.attr('title')).toBe('キャンセル');
    });

    it('check set multiple attributes', () => {
        $(prepareTestElements())
            .append(`
                <a id="testee" href="#" data-i18n="[title]app.common.cancel;app.common.close"></a>
            `);
        const $test = $('#testee');

        $test.localize();

        expect($test.attr('title')).toBe('キャンセル');
        expect($test.text()).toBe('閉じる');
    });

    it('check set innerHtml attributes', () => {
        $(prepareTestElements())
            .append(`
                <a id="testee" href="#" data-i18n="[html]app.common.save"></a>
            `);
        const $test = $('#testee');

        $test.localize();

        expect($test.text()).toBe('保存');
    });

    it('check prepend content', async () => {
        ensureCleanI18N();
        await initializeI18N({
            lng: 'ja',
            fallbackLng: 'en',
            namespace: 'messages',
            resourcePath: '../res/i18n/locales/{{ns}}.{{lng}}.json',
            fallbackResources: {
                'ja': 'ja-JP',
                'en': 'en-US',
            },
        });

        $(prepareTestElements())
            .append(`
                <a id="testee" href="#" data-i18n="[prepend]app.common.retry">insert before me, please!</a>
            `);
        const $test = $('#testee');

        $test.localize();

        let $wrap = $test.find('cdp-i18n');
        expect($wrap.text()).toBe('再試行');
        expect($test.text()).toBe('再試行insert before me, please!');

        await i18n.changeLanguage('en');
        $test.localize();

        $wrap = $test.find('cdp-i18n');
        expect($wrap.text()).toBe('Retry');
        expect($test.text()).toBe('Retryinsert before me, please!');
    });

    it('check prepend content w/ no use custom-tag', async () => {
        ensureCleanI18N();
        await initializeI18N({
            lng: 'ja',
            fallbackLng: 'en',
            namespace: 'messages',
            resourcePath: '../res/i18n/locales/{{ns}}.{{lng}}.json',
            fallbackResources: {
                'ja': 'ja-JP',
                'en': 'en-US',
            },
            dom: {
                customTagName: false,
            },
        });

        $(prepareTestElements())
            .append(`
                <a id="testee" href="#" data-i18n="[prepend]app.common.retry">insert before me, please!</a>
            `);
        const $test = $('#testee');

        $test.localize();
        expect($test.text()).toBe('再試行insert before me, please!');

        await i18n.changeLanguage('en');
        $test.localize();
        expect($test.text()).toBe('Retry再試行insert before me, please!');
    });

    it('check append content', async () => {
        ensureCleanI18N();
        await initializeI18N({
            lng: 'ja',
            fallbackLng: 'en',
            namespace: 'messages',
            resourcePath: '../res/i18n/locales/{{ns}}.{{lng}}.json',
            fallbackResources: {
                'ja': 'ja-JP',
                'en': 'en-US',
            },
        });

        $(prepareTestElements())
            .append(`
                <a id="testee" href="#" data-i18n="[append]app.common.retry">append after me, please!</a>
            `);
        const $test = $('#testee');

        $test.localize();

        let $wrap = $test.find('cdp-i18n');
        expect($wrap.text()).toBe('再試行');
        expect($test.text()).toBe('append after me, please!再試行');

        await i18n.changeLanguage('en');
        $test.localize();

        $wrap = $test.find('cdp-i18n');
        expect($wrap.text()).toBe('Retry');
        expect($test.text()).toBe('append after me, please!Retry');
    });

    it('check append content w/ no use custom-tag', async () => {
        ensureCleanI18N();
        await initializeI18N({
            lng: 'ja',
            fallbackLng: 'en',
            namespace: 'messages',
            resourcePath: '../res/i18n/locales/{{ns}}.{{lng}}.json',
            fallbackResources: {
                'ja': 'ja-JP',
                'en': 'en-US',
            },
            dom: {
                customTagName: false,
            },
        });

        $(prepareTestElements())
            .append(`
                <a id="testee" href="#" data-i18n="[append]app.common.retry">append after me, please!</a>
            `);
        const $test = $('#testee');

        $test.localize();
        expect($test.text()).toBe('append after me, please!再試行');

        await i18n.changeLanguage('en');
        $test.localize();
        expect($test.text()).toBe('append after me, please!再試行Retry');
    });

    it('check set data', () => {
        $(prepareTestElements())
            .append(`
                <a id="testee" href="#" data-i18n="[data-test]app.common.restore"></a>
            `);
        const $test = $('#testee');

        $test.localize();
        expect($test.data('test')).toBe('復元');
    });

    it('check options', () => {
        $(prepareTestElements())
            .append(`
                <a id="testee" href="#" data-i18n="app.utility.fraction"></a>
            `);
        const $test = $('#testee');

        $test.localize({ count: 20, total: 100 });
        expect($test.text()).toBe('20/100');
    });

    it('check options w/ attribute', async () => {
        ensureCleanI18N();
        await initializeI18N({
            lng: 'ja',
            load: 'languageOnly',
            fallbackLng: 'ja',
            namespace: 'messages',
            resourcePath: '../res/i18n/locales/{{ns}}.{{lng}}.json',
            fallbackResources: { 'ja': 'ja-JP' },
            dom: {
                useOptionsAttr: true,
            },
        });

        $(prepareTestElements())
            .append(`
                <a id="testee" href="#" data-i18n="app.utility.fraction" data-i18n-options='{ "count": 20, "total": 100 }'></a>
            `);
        const $test = $('#testee');

        $test.localize();
        expect($test.text()).toBe('20/100');
    });

    it('check set different attribute', async () => {
        $(prepareTestElements())
            .append(`
                <a id="testee" href="#" data-i18n="[title]app.nothing.title;app.nothing.text" title="fallback.title">fallback.text</a>
            `);
        let $test = $('#testee');

        $test.localize();

        expect($test.attr('title')).toBe('fallback.title');
        expect($test.text()).toBe('fallback.text');

        ensureCleanI18N();
        await initializeI18N({
            lng: 'ja',
            load: 'languageOnly',
            fallbackLng: 'ja',
            namespace: 'messages',
            resourcePath: '../res/i18n/locales/{{ns}}.{{lng}}.json',
            fallbackResources: { 'ja': 'ja-JP' },
            dom: {
                parseDefaultValueFromContent: false,
            },
        });

        $(prepareTestElements())
            .append(`
                <a id="testee" href="#" data-i18n="[title]app.nothing.title;app.nothing.text" title="fallback.title">fallback.text</a>
            `);
        $test = $('#testee');

        $test.localize();

        expect($test.attr('title')).toBe('app.nothing.title');
        expect($test.text()).toBe('app.nothing.text');
    });

    it('check miss key management', () => {
        $(prepareTestElements())
            .append(`
                <a id="testee" href="#" data-i18n="[ title ] app.common.cancel;"></a>
            `);
        const $test = $('#testee');

        $test.localize();

        expect($test.attr('title')).toBe('キャンセル');
        expect($test.text()).toBe('');
    });

    it('check before activate dom', () => {
        const $dom = $(`
            <div id="d1" class="test-dom">
                <a id="testee" href="#" data-i18n="app.common.transfer"></a>
            </div>
        `);

        $dom.localize();
        $dom.appendTo(document.body);

        const $test = $('#testee');
        expect($test.text()).toBe('送信');
    });

    it('check localize() w/ options', () => {
        $(prepareTestElements())
            .append(`
                <a id="testee" href="#" data-i18n="app.utility.fraction"></a>
            `);
        const el = $('#testee')[0];

        localize(el, { count: 20, total: 100 });
        expect(el.textContent).toBe('20/100');
    });

    it('check localize() w/ before activate', () => {
        const text = localize(`
            <a id="testee" href="#" data-i18n="app.common.transfer"></a>
        `)[0].outerHTML;
        expect(text).toBe('<a id="testee" href="#" data-i18n="app.common.transfer">送信</a>');
    });
});
