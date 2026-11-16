import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import Modal from './Modal';
import { useT } from '../i18n';

export interface ConfirmDialogOptions {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

export interface AlertDialogOptions {
  title?: string;
  message: string;
  okLabel?: string;
}

interface DialogApi {
  confirm: (options: ConfirmDialogOptions | string) => Promise<boolean>;
  alert: (options: AlertDialogOptions | string) => Promise<void>;
}

type DialogState =
  | { kind: 'confirm'; options: ConfirmDialogOptions; resolve: (value: boolean) => void }
  | { kind: 'alert'; options: AlertDialogOptions; resolve: () => void };

const DialogContext = createContext<DialogApi | null>(null);

export function DialogProvider({ children }: { children: ReactNode }) {
  const { t } = useT();
  const [dialog, setDialog] = useState<DialogState | null>(null);

  const confirm = useCallback((options: ConfirmDialogOptions | string) => {
    return new Promise<boolean>((resolve) => {
      setDialog({
        kind: 'confirm',
        options: typeof options === 'string' ? { message: options } : options,
        resolve,
      });
    });
  }, []);

  const alert = useCallback((options: AlertDialogOptions | string) => {
    return new Promise<void>((resolve) => {
      setDialog({
        kind: 'alert',
        options: typeof options === 'string' ? { message: options } : options,
        resolve,
      });
    });
  }, []);

  const value = useMemo<DialogApi>(() => ({ confirm, alert }), [confirm, alert]);

  function close(result: boolean): void {
    if (!dialog) return;
    if (dialog.kind === 'confirm') dialog.resolve(result);
    else dialog.resolve();
    setDialog(null);
  }

  const title = dialog
    ? dialog.options.title ?? (dialog.kind === 'confirm' ? t('common.confirmTitle') : t('common.notice'))
    : '';

  return (
    <DialogContext.Provider value={value}>
      {children}
      {dialog && (
        <Modal title={title} onClose={() => close(false)}>
          <p className="dialog-message">{dialog.options.message}</p>
          <div className="modal-actions">
            {dialog.kind === 'confirm' && (
              <button type="button" className="btn btn-ghost" onClick={() => close(false)}>
                {dialog.options.cancelLabel ?? t('common.cancel')}
              </button>
            )}
            <button
              type="button"
              className={`btn ${
                dialog.kind === 'confirm' && dialog.options.danger ? 'btn-danger' : 'btn-primary'
              }`}
              onClick={() => close(true)}
              autoFocus
            >
              {dialog.kind === 'confirm'
                ? dialog.options.confirmLabel ?? t('common.confirm')
                : dialog.options.okLabel ?? t('common.ok')}
            </button>
          </div>
        </Modal>
      )}
    </DialogContext.Provider>
  );
}

export function useDialog(): DialogApi {
  const context = useContext(DialogContext);
  if (!context) throw new Error('useDialog must be used within DialogProvider');
  return context;
}
