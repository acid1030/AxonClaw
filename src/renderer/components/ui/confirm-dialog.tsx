import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'default' | 'destructive';
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
  confirmDisabled?: boolean;
  contentClassName?: string;
  titleClassName?: string;
  messageClassName?: string;
  cancelButtonClassName?: string;
  confirmButtonClassName?: string;
  /** 可选：在 message 和 footer 之间渲染额外内容 */
  children?: React.ReactNode;
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'default',
  onConfirm,
  onCancel,
  confirmDisabled = false,
  contentClassName,
  titleClassName,
  messageClassName,
  cancelButtonClassName,
  confirmButtonClassName,
  children,
}: ConfirmDialogProps) {
  const [loading, setLoading] = React.useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className={cn('sm:max-w-md', contentClassName)} onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className={titleClassName}>{title}</DialogTitle>
          {message && <DialogDescription className={messageClassName}>{message}</DialogDescription>}
        </DialogHeader>
        {children}
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onCancel} disabled={loading} className={cancelButtonClassName}>
            {cancelLabel}
          </Button>
          <Button
            variant={variant === 'destructive' ? 'destructive' : 'default'}
            onClick={() => void handleConfirm()}
            disabled={loading || confirmDisabled}
            className={confirmButtonClassName}
          >
            {loading ? '...' : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
