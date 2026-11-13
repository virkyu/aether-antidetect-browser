import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import gsap from 'gsap';
import { cn } from '../../lib/utils';

export const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-xs font-medium transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 select-none cursor-pointer',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 active:scale-[0.98]',
        destructive: 'bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90 active:scale-[0.98]',
        outline: 'border border-input bg-background shadow-xs hover:bg-accent hover:text-accent-foreground',
        secondary: 'bg-secondary text-secondary-foreground shadow-xs hover:bg-secondary/80 border border-border',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-9 px-4 py-2',
        sm: 'h-8 rounded-md px-3 text-xs gap-1.5',
        md: 'h-9 rounded-md px-3.5 text-xs gap-2',
        lg: 'h-10 rounded-md px-6 text-sm gap-2.5',
        icon: 'h-9 w-9 p-0',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    Omit<VariantProps<typeof buttonVariants>, 'variant' | 'size'> {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link' | 'primary' | 'danger' | 'white';
  size?: 'default' | 'sm' | 'md' | 'lg' | 'icon';
  asChild?: boolean;
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', asChild = false, loading, children, disabled, onMouseDown, ...props }, ref) => {
    // Map legacy variants to standard shadcn variants
    let canonicalVariant: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link' = 'default';
    if (variant === 'primary' || variant === 'white') canonicalVariant = 'default';
    else if (variant === 'danger') canonicalVariant = 'destructive';
    else if (variant) canonicalVariant = variant;

    let canonicalSize: 'default' | 'sm' | 'md' | 'lg' | 'icon' = 'default';
    if (size === 'md') canonicalSize = 'default';
    else if (size) canonicalSize = size;

    const Comp = asChild ? Slot : 'button';

    return (
      <Comp
        ref={ref}
        disabled={disabled || loading}
        className={cn(buttonVariants({ variant: canonicalVariant, size: canonicalSize, className }))}
        {...props}
      >
        {loading ? (
          <svg className="animate-spin h-3.5 w-3.5 text-current shrink-0" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
        ) : null}
        {children}
      </Comp>
    );
  }
);

Button.displayName = 'Button';
