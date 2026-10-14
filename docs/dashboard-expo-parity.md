# Comparación dashboard y Expo — 13/10/2026

La app móvil cubre los flujos de garzón, cajero y barman. No replica todas las pantallas administrativas del dashboard.

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
