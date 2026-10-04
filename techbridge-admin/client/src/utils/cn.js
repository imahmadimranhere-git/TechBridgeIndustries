import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Joins class names and resolves Tailwind conflicts:
 * cn('px-4 bg-brand', isSmall && 'px-2') -> 'bg-brand px-2'
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}