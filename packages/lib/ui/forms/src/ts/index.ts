export const UI_FORMS_STATUS = 'UNDER CONSTRUCTION';

import { noop, post } from '@cdp/runtime';

import styleCore from '@css/structure.css' with { type: 'css' };
import styleButton from '@css/structure-button.css' with { type: 'css' };

void post(noop(styleCore, styleButton));
