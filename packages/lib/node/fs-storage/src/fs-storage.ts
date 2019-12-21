export const STATUS = 'TODO';

import { resolve } from 'path';
import { existsSync } from 'fs-extra';

export function check(path: string): boolean {
    return existsSync(resolve(process.cwd(), path));
}
