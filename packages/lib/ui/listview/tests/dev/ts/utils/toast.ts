import {
    type PlainObject,
    type Writable,
    setInterval,
    clearInterval,
    sleep,
    dom as $,
    AppContext,
} from '@cdp/runtime';

/** 表示時間の定義 */
export const enum ToastDuration {
    BRIEF = 500,
    SHORT = 1500,
    LONG  = 4000,
}

/** 表示位置 */
export type ToastPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'top' | 'bottom' | 'left' | 'right' | 'center';

/**
 * スタイル変更時に使用するインターフェイス
 * css にスタイルを逃がす場合、独自の class を設定し、getStyle は null を返すこと。
 */
export interface ToastStyleBuilder {
    /** class attribute に設定する文字列を取得 */
    readonly class: string[];
    /** style attribute に設定する JSON オブジェクトを取得 */
    readonly style: PlainObject<string | number | boolean | null>;
    /** 既定のポジション */
    readonly position: ToastPosition;
    /** 既定のオフセット値を取得 [x, y] */
    readonly offset: [number, number];
    /** 終了処理 */
    out(el: HTMLElement, duration?: number): Promise<void>;
}

/** Toast.show() に指定できるオプション */
export interface ToastOptions extends Partial<Writable<ToastStyleBuilder>> {
    builder?: ToastStyleBuilder;
    duration?: number;
    outDuration?: number;
}

//__________________________________________________________________________________________________//

const styleText = `
.ui-loader {
    display: none;
    z-index: 9999999;
    position: fixed;
    top: 50%;
    left: 50%;
    border: 0;
}
.ui-overlay-shadow {
    box-shadow: 0 0 12px rgba(0,0,0,.6);
}
.ui-corner-all {
    border-radius: calc(16px * 0.3125);
}
`;
const sheet = new CSSStyleSheet();
sheet.replaceSync(styleText);

const defaults = document.adoptedStyleSheets;
document.adoptedStyleSheets = [...defaults, sheet];

//__________________________________________________________________________________________________//

/** オフセットの基準 */
const enum ToastPositionCode {
    X_LEFT    = 1,
    X_RIGHT   = 2,
    X_CENTER  = 3,
    Y_TOP     = 4,
    Y_BOTTOM  = 5,
    Y_CENTER  = 6,
}

/** 既定の {@link ToastStyleBuilder} */
class DefaultStyleBuilder implements ToastStyleBuilder {
    /** class attribute に設定する文字列を取得 */
    get class(): string[] {
        return ['ui-loader', 'ui-overlay-shadow', 'ui-corner-all'];
    }

    /** style attribute に設定する JSON オブジェクトを取得 */
    get style(): PlainObject<string | number | boolean | null> {
        const style = {
            'padding':          '7px 25px 7px 25px',
            'display':          'block',
            'visibility':       'hidden',
            'background-color': '#1d1d1d',
            'border-color':     '#1b1b1b',
            'color':            '#fff',
            'text-shadow':      '0 1px 0 #111',
            'font-weight':      'bold',
            'opacity':          0.8,
        };
        return style;
    }

    /** 既定のポジション */
    get position(): ToastPosition {
        return 'bottom';
    }

    /** オフセット値を取得 [x, y] */
    get offset(): [number, number] {
        return [0, -75];
    }

    /** 終了処理 */
    out(el: HTMLElement, duration?: number): Promise<void> {
        duration = duration ?? ToastDuration.BRIEF;
        // fadeout element
        return new Promise(resolve => {
            let opacity = 1; // 初期透明度
            const timer = setInterval(() => {
                if (opacity <= 0.1){
                    clearInterval(timer);
                    el.remove();
                    return resolve();
                }
                el.style.opacity = String(opacity);
                el.style.filter = `alpha(opacity=${opacity * 100})`;
                opacity -= opacity * 0.1;
            }, duration / 50);
        });
    }
}

//__________________________________________________________________________________________________//

/** position */
const toPositionCode = (position: ToastPosition): [ToastPositionCode, ToastPositionCode] => {
    switch (position) {
        case 'top-left':
            return [ToastPositionCode.X_LEFT, ToastPositionCode.Y_TOP];
        case 'top':
            return [ToastPositionCode.X_CENTER, ToastPositionCode.Y_TOP];
        case 'top-right':
            return [ToastPositionCode.X_RIGHT, ToastPositionCode.Y_TOP];
        case 'bottom-left':
            return [ToastPositionCode.X_LEFT, ToastPositionCode.Y_BOTTOM];
        case 'bottom':
            return [ToastPositionCode.X_CENTER, ToastPositionCode.Y_BOTTOM];
        case 'bottom-right':
            return [ToastPositionCode.X_RIGHT, ToastPositionCode.Y_BOTTOM];
        case 'left':
            return [ToastPositionCode.X_LEFT, ToastPositionCode.Y_CENTER];
        case 'center':
            return [ToastPositionCode.X_CENTER, ToastPositionCode.Y_CENTER];
        case 'right':
            return [ToastPositionCode.X_RIGHT, ToastPositionCode.Y_CENTER];
        default:
            // eslint-disable-next-line
            throw new TypeError(`unsupported position: ${position}`);
    }
};

/** Legasy toast class */
export class Toast {
    /**
     * Toast 表示
     *
     * @param message メッセージ
     * @param options 表示設定
     */
    public static async show(message: string, options?: ToastOptions): Promise<void> {
        const {
            class: cls,
            style,
            position,
            offset,
            builder,
            duration,
            outDuration,
            out,
        } = Object.assign({ duration: ToastDuration.SHORT, builder: new DefaultStyleBuilder() }, options);

        // 改行コードは <br/> に置換する
        const msg = message.replace(/\n/g, '<br/>');

        // メッセージ element の動的生成
        const cssProps = Object.assign({
            'top': 0, 'left': 0,    // 自動改行されてもよいように、基点を設定してから追加
        }, style ?? builder.style);

        const $box = $(`<div>${msg}</div>`).addClass(cls ?? builder.class).css(cssProps);
        $box.appendTo(AppContext().router.el);

        // 配置位置の決定
        const [posCodeX, posCodeY] = toPositionCode(position ?? builder.position);
        const [offsetX, offsetY] = offset ?? builder.offset;
        const $window = $(window);

        const posX = (() => {
            const boxWidth = $box.width() + parseInt($box.css('padding-left'), 10) + parseInt($box.css('padding-right'), 10);
            const winWidth = $window.width();
            switch (posCodeX) {
                case ToastPositionCode.X_LEFT:
                    return 0 + offsetX;
                case ToastPositionCode.X_RIGHT:
                    return winWidth - boxWidth + offsetX;
                case ToastPositionCode.X_CENTER:
                    return (winWidth / 2) - (boxWidth / 2) + offsetX;
                default:
                    console.warn(`warn. unknown offsetPoint: ${posCodeX}`);
                    return (winWidth / 2) - (boxWidth / 2) + offsetX;
            }
        })();

        const posY = (() => {
            const boxHeight = $box.height() + parseInt($box.css('padding-top'), 10) + parseInt($box.css('padding-bottom'), 10);
            const winHeight = $window.height();
            switch (posCodeY) {
                case ToastPositionCode.Y_TOP:
                    return 0 + offsetY;
                case ToastPositionCode.Y_BOTTOM:
                    return winHeight - boxHeight + offsetY;
                case ToastPositionCode.Y_CENTER:
                    return (winHeight / 2) - (boxHeight / 2) + offsetY;
                default:
                    console.warn(`warn. unknown offsetPoint: ${posCodeY}`);
                    return (winHeight / 2) - (boxHeight / 2) + offsetY;
            }
        })();

        // 表示
        $box.css({ 'top': `${posY}px`, 'left': `${posX}px`, 'visibility': 'visible' });
        await sleep(duration);

        const outFunc = out ?? builder.out;
        await outFunc($box[0], outDuration);
    }
}
