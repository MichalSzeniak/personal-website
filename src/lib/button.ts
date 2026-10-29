/** Shared look of link buttons and real buttons: two cells tall (48 px), on the notebook grid. */
export const buttonBase =
  'inline-flex h-cells-2 min-w-cells-6 items-center justify-center border-2 px-cell font-display text-base font-semibold transition-colors duration-150 motion-reduce:transition-none';

export const buttonVariants = {
  primary: 'border-accent bg-accent text-on-accent hover:border-ink hover:bg-ink hover:text-paper',
  secondary: 'border-ink bg-paper text-ink hover:bg-ink hover:text-paper',
} as const;

export type ButtonVariant = keyof typeof buttonVariants;
