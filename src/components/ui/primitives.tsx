import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { X } from 'lucide-react';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const buttonVariants = cva(
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-transparent px-4 text-base font-semibold whitespace-nowrap',
  {
    variants: {
      variant: {
        primary: 'border-action-border bg-action-bg text-action-fg shadow-sm hover:bg-action-hover',
        outline: 'border-control-border bg-surface text-secondary hover:bg-surface-hover',
        ghost: 'bg-transparent text-secondary hover:bg-surface-hover',
      },
    },
    defaultVariants: { variant: 'primary' },
  },
);

export function Button({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<'button'> & VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Component = asChild ? Slot : 'button';

  return <Component className={cn(buttonVariants({ variant }), className)} {...props} />;
}

const controlStyles =
  'h-12 w-full rounded-lg border border-control-border bg-surface px-3 py-2 text-base text-primary transition-colors duration-150 placeholder:text-placeholder focus-visible:border-accent focus-visible:ring-3 focus-visible:ring-focus-halo focus-visible:outline-none disabled:bg-disabled-surface disabled:text-disabled-text aria-invalid:border-error-border aria-invalid:focus-visible:border-error-border aria-invalid:focus-visible:ring-error-focus-halo';

export function Input({ className, ...props }: React.ComponentProps<'input'>) {
  return <input className={cn(controlStyles, className)} {...props} />;
}

export function Select({ className, ...props }: React.ComponentProps<'select'>) {
  return <select className={cn(controlStyles, className)} {...props} />;
}

export function PanelFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn(
        'flex shrink-0 justify-end gap-2.5 border-t border-border bg-surface px-6 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-8',
        className,
      )}
      {...props}
    />
  );
}

export const Dialog = DialogPrimitive.Root;
export const DialogTitle = DialogPrimitive.Title;
export const DialogDescription = DialogPrimitive.Description;

export function SheetContent({
  children,
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content>) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-30 animate-fade-in bg-overlay" />
      <DialogPrimitive.Content
        className={cn(
          'fixed top-0 right-0 z-40 flex h-dvh w-full max-w-2xl animate-slide-in flex-col bg-surface shadow-2xl outline-none',
          className,
        )}
        {...props}
      >
        {children}
        <DialogPrimitive.Close
          className="absolute top-6 right-6 grid h-11 w-10 place-items-center rounded-md border-0 bg-transparent text-secondary hover:bg-surface-hover hover:text-accent"
          aria-label="Close panel"
        >
          <X className="size-5" />
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

export function ConfirmContent({ children }: { children: React.ReactNode }) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 animate-fade-in bg-overlay" />
      <DialogPrimitive.Content className="fixed top-1/2 left-1/2 z-60 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border bg-surface p-6 shadow-2xl">
        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}
