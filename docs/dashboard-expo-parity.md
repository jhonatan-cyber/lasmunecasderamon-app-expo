# Comparación dashboard y Expo — 13/10/2026

La app móvil cubre los flujos de anfitriona, garzón, cajero y barman. No replica todas las pantallas administrativas del dashboard.

## Tope de precio del acompañamiento — revisión del 17/11/2026

- Regla de Configuraciones → Bar → Comisiones → reglas: `tope_precio_acompañamiento` (0 = desactivada). Cada unidad de acompañamiento que supera el tope suma su exceso (`precio - tope`); las que están en el tope o bajo él no suman ni descuentan.
- El exceso se calcula por unidad del acompañamiento y se multiplica por la cantidad vendida del producto. Ejemplo: tope 5000, dos acompañamientos de 8000 y cantidad 2 → (8000 − 5000) × 2 × 2 = 12000.
- Aplica a botellas (`acompanamiento_botella`) y a cortos de cliente (`acompanamiento_corto.precio`). Los cortos de anfitriona consumen ml de la botella y no llevan recargo.
- El recargo viaja como `recargo_acompanamiento` por unidad en ventas (`POST /sales`) y pedidos (`POST /orders`); el servidor lo vuelve a multiplicar por la cantidad, y el subtotal local se valida como `(precio + recargo) × cantidad` antes de encolar.
- En la UI de cortos y botellas se indica cuánto suma cada acompañamiento sobre el tope; sin precio de catálogo se avisa que no suma excedente.

## Limpieza y Colaciones — revisión del 05/11/2026

- Limpieza: se eliminaron las tarjetas y pantallas de barman (`/barman/limpieza`), cajero (`/cajero/limpieza`) y anfitriona (`/anfitriona/limpieza`).
- Colaciones: las entrega únicamente el barman (`/barman/colaciones`); la pantalla del cajero se retiró. Cajero, anfitriona y garzón reciben colación pero no la registran: no tienen la tarjeta en su inicio y un enlace directo a la pantalla de registro los redirige. Requiere caja abierta, muestra catálogo de bebidas analcohólicas y permite registrar con acompañamiento si la bebida lo tiene configurado.

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
