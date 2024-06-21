import {
    type DOM,
    dom as $,
} from '@cdp/runtime';

declare module '@cdp/runtime' {
    interface DOMPlugin {
        /** ripple 化 */
        ripple(): this;
    }
}

//__________________________________________________________________________________________________//

const styleText = `
.ui-ripple {
    overflow:       hidden !important;
    cursor:         pointer;
    user-select:    none;
}

.ui-ripple-ink {
    position:       absolute;
    display:        block;
    border-radius:  50%;
    opacity:        0.4;
    transform:      scale(0);
}

.ui-ripple-ink.ui-ripple-animate {
    animation: ripple 0.6s linear;
}

@keyframes ripple {
    100% {
        opacity:    0;
        transform:  scale(2.5);
    }
}
`;
const sheet = new CSSStyleSheet();
sheet.replaceSync(styleText);

const defaults = document.adoptedStyleSheets;
document.adoptedStyleSheets = [...defaults, sheet];

//__________________________________________________________________________________________________//

export interface DomRippleOptions {} // eslint-disable-line

function ripple(this: DOM, options?: DomRippleOptions): DOM { // eslint-disable-line @typescript-eslint/no-unused-vars
    const self = this; // eslint-disable-line no-invalid-this
    const $el = $(self);
    if ($el.length <= 0) {
        return $el;
    }
    return $el.on('click', (ev: PointerEvent) => {
        const $surface = $(self);

        // create surface if it doesn't exist
        if (0 === $surface.find('.ui-ripple-ink').length) {
            $surface.prepend('<div class="ui-ripple-ink"></div>');
        }

        const $ink = $surface.find('.ui-ripple-ink');

        // stop the previous animation
        $ink.removeClass('ui-ripple-animate');

        // ink size:
        if (!$ink.height() && !$ink.width()) {
            const d = Math.max($surface.outerWidth(), $surface.outerHeight());
            $ink.css({ height: d, width: d });
        }

        const x = (ev.clientX + window.scrollX) - $surface.offset().left - ($ink.width() / 2);
        const y = (ev.clientY + window.scrollY) - $surface.offset().top - ($ink.height() / 2);

        const rippleColor = $surface.data('ripple-color') as string ?? null;

        // animation end handler
        $ink.on('animationend', () => {
            $ink.off();
            $ink.removeClass('ui-ripple-animate');
        });

        // set the position and add class .animate
        $ink.css({
            top: `${y}px`,
            left: `${x}px`,
            background: rippleColor
        }).addClass('ui-ripple-animate');
    });
}

$.fn['ripple'] = ripple;
