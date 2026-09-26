import { matches } from '../util';
const pattern = /(?<![\w-])(?:sk-(?:proj-)?[A-Za-z0-9_-]{20,}|gh[pousr]_[A-Za-z0-9]{36,}|github_pat_[A-Za-z0-9_]{22,}|AKIA[0-9A-Z]{16}|AIza[0-9A-Za-z_-]{35}|xox[baprs]-[A-Za-z0-9-]{10,}|(?:sk|rk)_live_[0-9A-Za-z]{24,}|eyJ[\w-]{10,}\.[\w-]{10,}\.[\w-]{10,})(?![\w-])|-----BEGIN (?:RSA |EC |OPENSSH |DSA |ENCRYPTED )?PRIVATE KEY-----[\s\S]*?-----END (?:RSA |EC |OPENSSH |DSA |ENCRYPTED )?PRIVATE KEY-----/g;
export const find = (text: string) => matches(text, pattern, 'API_KEY');
