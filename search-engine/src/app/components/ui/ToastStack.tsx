import { AnimatePresence, motion } from "framer-motion";
import { Button } from "./Button";
import { CloseIcon } from "./icons";

export type ToastItem = {
  id: string;
  message: string;
};

type ToastStackProps = {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
  dismissLabel: string;
};

export function ToastStack({ toasts, onDismiss, dismissLabel }: ToastStackProps) {
  if (toasts.length === 0) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-50 flex flex-col items-center gap-2 px-3 sm:items-end sm:px-6">
      <AnimatePresence initial={false}>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            role="alert"
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.2 }}
            className="pointer-events-auto flex w-full max-w-sm items-start gap-2 rounded-xl border border-danger/30 bg-surface p-3 shadow-lg"
          >
            <p className="flex-1 text-b4 text-danger">{toast.message}</p>
            <Button
              type="button"
              variant="ghost"
              tone="primary"
              size="sm"
              aria-label={dismissLabel}
              onClick={() => onDismiss(toast.id)}
            >
              <CloseIcon className="size-3.5" />
            </Button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
