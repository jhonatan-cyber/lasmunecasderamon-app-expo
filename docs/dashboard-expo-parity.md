# Comparación dashboard y Expo — 13/10/2026

La app móvil cubre los flujos de anfitriona, garzón, cajero y barman. No replica todas las pantallas administrativas del dashboard.

## Anfitrionas — revisión del 14/10/2026

- Servicios de solo lectura: sin edición, pausa, reasignación ni creación directa desde el rol anfitriona. El dashboard rechaza las mutaciones también en la API.
- Estado de servicio: 0 anulado, 1 finalizado, 2 en proceso, 3 pausado y 4 solicitud de anulación. Finalizar un servicio no significa haber pagado su comisión.
- Servicios muestran la comisión personal (`comision_usuario`), excluyendo anulados del total ganado. Una asignación liberada permanece en el historial pero no se presenta como servicio activo.
- Comisiones de ventas: ambas pantallas usan `/commissions/user?tipo=detalle` y muestran 0 anulado, 1 pendiente, 2 pagado. Los anulados no incrementan los totales ni aparecen como cobrados.
- Asistencia de anfitrionas: historial completo, sueldo menos aporte y descuento de alojamiento del resumen del servidor, con mínimo de cero.
- Anticipos: solicitud personal, límite disponible, bloqueo de nueva solicitud pendiente e historial de aprobación y pagos en ambos clientes.
- Calendario: eventos propios de `/events/user`, importes personales y estados específicos por tipo. Las comisiones de servicios no se suman dos veces en el balance.

La comprobación automatizada cubre permisos de API, cálculos, solicitudes de anticipo y persistencia PostgreSQL. No sustituye una prueba manual con la misma cuenta en un dispositivo Android/iOS y en el navegador.

## Cambios de esta revisión

- Pedidos: el detalle separa los cortos en unidades configurables con bebida y anfitriona propias.
- Ventas: opción para separar los cortos y configurar cada unidad sin cambiar el total.
- Carritos: borradores por usuario y flujo; restauración antes del guardado inicial; limpieza con Atrás y tras el envío de la venta, incluso cuando se guarda en la cola sin conexión.
- Propina: activación por pulsación en vez de casilla o switch.
- Bar: los ml de corto solo aparecen si el producto ofrece ese formato; el contenido abierto se identifica por producto.
- Salir de la cuenta limpia el carrito en memoria.

## Reglas compartidas revisadas

Los pedidos y ventas conservan la presentación, el tipo de venta, el precio configurado, la comisión y el consumo de la bebida. El backend compartido valida el stock y descuenta los ml de anfitriona o la unidad completa del cliente. Los tests existentes también cubren servicios, habitaciones, temporizadores y la cola sin conexión.

## Diferencias que siguen presentes

- El dashboard ofrece administración de configuraciones, compras, categorías y habitaciones; no hay equivalentes completos para todas ellas en Expo.
- El modal de categoría móvil sigue un flujo de adición por producto, diferente al botón global Agregar/Cancelar del dashboard.
- En ventas móviles, separar cortos es una acción explícita. En pedidos se realiza al abrir el detalle completo.
- Los cambios visuales necesitan validación en Android/iOS; esta revisión ejecuta pruebas automatizadas y comprobaciones de tipos, no una prueba manual en dispositivo.

No se afirma equivalencia completa de pantallas ni despliegue en producción.
