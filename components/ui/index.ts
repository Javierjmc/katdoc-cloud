// components/ui/index.ts
// Barrel export — importa desde '@/components/ui' en lugar de rutas largas

export { Button }                           from './Button';
export { Field, Input, Textarea, Select }   from './Input';
export { Badge, Spinner, PageLoader, EmptyState, Card, ErrorMessage, SuccessMessage } from './Badge';
export { PageHeader }                       from './PageHeader';
export { ConfirmDialog }                    from './ConfirmDialog';
export { ToastProvider, useToast }          from './Toast';
export { LoadMoreButton }                   from './LoadMoreButton';
