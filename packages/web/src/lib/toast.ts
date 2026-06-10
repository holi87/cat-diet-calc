type ToastListener = (message: string) => void;

let listener: ToastListener | null = null;

export function setToastListener(l: ToastListener | null) {
  listener = l;
}

/** Show a global error toast (no-op until the ErrorToasts component mounts). */
export function showErrorToast(message: string) {
  listener?.(message);
}
