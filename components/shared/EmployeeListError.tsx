import { ErrorState } from '@/components/ui/ErrorState';

/**
 * Wrapper del componente ErrorState para los screens de listas de empleados.
 * Se mantiene como alias para no romper los 8 archivos que lo consumen;
 * internamente delega en ErrorState con la variante inline.
 */
export function EmployeeListError({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <ErrorState
      variant="inline"
      icon="alert-circle-outline"
      title="Error de conexiÃ³n"
      message={message}
      retryLabel="Reintentar"
      onRetry={onRetry}
    />
  );
}
