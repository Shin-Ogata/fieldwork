export const UI_FORMS_STATUS = 'UNDER CONSTRUCTION';

import { noop, post } from '@cdp/runtime';

import styleCore from '@css/structure.css' assert { type: 'css' };
import styleButton from '@css/structure-button.css' assert { type: 'css' };
void post(noop(styleCore, styleButton));
