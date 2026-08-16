import { type ReactNode, useCallback, useRef, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { ConfirmContext, type ConfirmOptions, type ConfirmVariant } from '../../hooks/confirm-context';

type ConfirmProviderProps = {
  children: ReactNode;
};

type ConfirmProviderOptions = Required<ConfirmOptions>;

const DEFAULT_OPTIONS: ConfirmProviderOptions = {
  title: '',
  description: '',
  confirmText: '확인',
  cancelText: '취소',
  variant: 'primary',
  actionOrder: 'cancel-first',
};

const variantStyles: Record<ConfirmVariant, { icon: string; confirm: string }> = {
  primary: {
    icon: 'bg-blue-50 text-blue-700 ring-blue-100',
    confirm: 'bg-blue-600 text-white hover:bg-blue-700 focus-visible:outline-blue-300',
  },
  danger: {
    icon: 'bg-red-50 text-red-700 ring-red-100',
    confirm: 'bg-red-600 text-white hover:bg-red-700 focus-visible:outline-red-300',
  },
};

const ConfirmProvider = ({ children }: ConfirmProviderProps) => {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState(DEFAULT_OPTIONS);
  const resolverRef = useRef<((value: boolean) => void) | null>(null);

  const resolve = useCallback((value: boolean) => {
    resolverRef.current?.(value);
    resolverRef.current = null;
    setOpen(false);
  }, []);

  const confirm = useCallback((nextOptions: ConfirmOptions) => {
    setOptions({ ...DEFAULT_OPTIONS, ...nextOptions });
    setOpen(true);

    return new Promise<boolean>((resolver) => {
      resolverRef.current = resolver;
    });
  }, []);

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen) {
        resolve(false);
      }
    },
    [resolve]
  );

  const currentVariant = variantStyles[options.variant] || variantStyles.primary;
  const actionButtons = [
    {
      key: 'cancel',
      label: options.cancelText,
      onClick: () => resolve(false),
      className:
        'border border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-slate-300',
    },
    {
      key: 'confirm',
      label: options.confirmText,
      onClick: () => resolve(true),
      className: currentVariant.confirm,
    },
  ];
  const orderedButtons =
    options.actionOrder === 'confirm-first' || options.variant === 'danger'
      ? [actionButtons[1], actionButtons[0]]
      : actionButtons;
  const showIcon = options.variant === 'danger';

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      <Dialog.Root open={open} onOpenChange={handleOpenChange}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-[1px]" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-slate-200 bg-white p-5 shadow-xl focus:outline-none sm:p-6">
            <div className="flex gap-4">
              {showIcon && (
                <span
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold ring-4 ${currentVariant.icon}`}
                >
                  !
                </span>
              )}
              <div className="min-w-0">
                <Dialog.Title className="text-lg font-semibold text-slate-900">
                  {options.title}
                </Dialog.Title>
                {options.description && (
                  <Dialog.Description className="mt-2 text-sm leading-6 text-slate-600">
                    {options.description}
                  </Dialog.Description>
                )}
              </div>
            </div>
            <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
              {orderedButtons.map((button) => (
                <button
                  key={button.key}
                  type="button"
                  onClick={button.onClick}
                  className={`min-h-11 w-full rounded-md px-4 py-2 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 sm:w-auto ${button.className}`}
                >
                  {button.label}
                </button>
              ))}
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </ConfirmContext.Provider>
  );
};

export default ConfirmProvider;
