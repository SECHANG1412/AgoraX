import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { COMMON_MESSAGES } from '../../constants/messages';
import { AUTH_FEEDBACK_EVENT } from '../../utils/toastEvents';

const DEFAULT_OPTIONS = {
  title: '',
  message: '',
  confirmText: COMMON_MESSAGES.confirm,
};

type AuthFeedbackEventDetail = {
  title?: string;
  message?: string;
  confirmText?: string;
  resolve?: () => void;
};

type AuthFeedbackProviderProps = {
  children: ReactNode;
};

const AuthFeedbackProvider = ({ children }: AuthFeedbackProviderProps) => {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState(DEFAULT_OPTIONS);
  const resolverRef = useRef<(() => void) | null>(null);

  const resolve = useCallback(() => {
    resolverRef.current?.();
    resolverRef.current = null;
    setOpen(false);
  }, []);

  useEffect(() => {
    const handleAuthFeedback = (event: Event) => {
      const { resolve: resolver, ...nextOptions } = (event as CustomEvent<AuthFeedbackEventDetail>).detail || {};

      resolverRef.current?.();
      resolverRef.current = typeof resolver === 'function' ? resolver : null;
      setOptions({ ...DEFAULT_OPTIONS, ...nextOptions });
      setOpen(true);
    };

    window.addEventListener(AUTH_FEEDBACK_EVENT, handleAuthFeedback);

    return () => {
      window.removeEventListener(AUTH_FEEDBACK_EVENT, handleAuthFeedback);
    };
  }, []);

  return (
    <>
      {children}
      <Dialog.Root open={open} onOpenChange={(nextOpen) => !nextOpen && resolve()}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-[1px]" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-slate-200 bg-white p-5 shadow-xl focus:outline-none sm:p-6">
            <div className="flex gap-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-50 text-sm font-bold text-blue-700 ring-4 ring-blue-100">
                i
              </span>
              <div className="min-w-0">
                <Dialog.Title className="text-lg font-semibold text-slate-900">
                  {options.title}
                </Dialog.Title>
                {options.message && (
                  <Dialog.Description className="mt-2 text-sm leading-6 text-slate-600">
                    {options.message}
                  </Dialog.Description>
                )}
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={resolve}
                className="min-h-11 w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-300 sm:w-auto"
              >
                {options.confirmText}
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
};

export default AuthFeedbackProvider;
