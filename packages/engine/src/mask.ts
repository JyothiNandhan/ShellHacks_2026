import type { EntityType } from './types';
export function maskValue(type: EntityType, value: string): string {
  const digits = value.replace(/\D/g, '');
  switch (type) {
    case 'EMAIL': return `${value[0] ?? ''}••••••@${value.slice(value.lastIndexOf('@') + 1)}`;
    case 'PHONE': return `•••-•••-${digits.slice(-4)}`;
    case 'SSN': return `•••-••-${digits.slice(-4)}`;
    case 'CREDIT_CARD': return `•••• ${digits.slice(-4)}`;
    case 'BANK': return `•••••${digits.slice(-4)}`;
    case 'API_KEY': return value.length > 7 ? `${value.slice(0, 3)}••••${value.slice(-4)}` : '••••••••';
    case 'PASSWORD': return '••••••••';
    case 'ADDRESS': return `${/^\d+/.exec(value)?.[0] ?? ''} •••••`.trim();
    case 'DATE_OF_BIRTH': return '••/••/••••';
    case 'IP_ADDRESS': return `•••.•••.•••.${value.split('.').pop()}`;
    default: return `${value[0] ?? ''}••••••`;
  }
}
