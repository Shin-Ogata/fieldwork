import { getConfig } from '@cdp/core-utils';
import { AppView } from './app-view';

const config = getConfig<{ app?: AppView; }>();
config.app = new AppView();
