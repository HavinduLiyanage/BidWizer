import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/cn'

const styles = cva('btn', {
  variants: {
    variant: {
      primary: 'btn-primary',
      secondary: 'btn-secondary',
      ghost: 'btn-ghost',
      outline: 'border border-border text-ink bg-white hover:bg-slate-50'
    },
    size: { sm: 'px-4 py-2 text-xs', md: '', lg: 'px-6 py-3.5 text-base' }
  },
  defaultVariants: { variant: 'primary', size: 'md' }
})

export type ButtonProps = React.ComponentProps<'button'> & VariantProps<typeof styles>

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return <button className={cn(styles({ variant, size }), className)} {...props} />
}
