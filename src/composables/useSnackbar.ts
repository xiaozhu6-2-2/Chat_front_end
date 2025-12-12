//更简洁的封装，使用时无需再声明一下store
import { useSnackbarStore } from '@/stores/snackbarStore'

export function useSnackbar() {
  const snackbarStore = useSnackbarStore()

  return {
    show: (text: string, options?: any) => snackbarStore.show(text, options),
    showSuccess: (text: string, timeout?: number) => snackbarStore.success(text, timeout),
    showError: (text: string, timeout?: number) => snackbarStore.error(text, timeout),
    showWarning: (text: string, timeout?: number) => snackbarStore.warning(text, timeout),
    showInfo: (text: string, timeout?: number) => snackbarStore.info(text, timeout),
    close: () => snackbarStore.close(),
  }
}