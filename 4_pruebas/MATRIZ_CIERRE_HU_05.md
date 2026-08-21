# Matriz de cierre HU-05

Fecha de actualizacion: 2026-08-20

Esta matriz deja trazabilidad del flujo de pago y facturacion implementado para NEO GEST.

## Comando de verificacion

Con backend y frontend activos:

```powershell
cd C:\Users\jebus\OneDrive\Documentos\NEO_GEST
powershell -ExecutionPolicy Bypass -File 4_pruebas\pruebas\test_hu_05.ps1
```

Resultado esperado:

```text
OK: HU-05 pago aprobado, factura y validaciones verificadas
```

## Matriz funcional

| Criterio | Estado | Evidencia tecnica | Captura sugerida |
| --- | --- | --- | --- |
| Registrar un pago vinculado a `id_pedido` | Implementado | `POST /api/v1/pagos` crea registro en `pago.Pedido_idPedido` | Swagger con respuesta del pago |
| Abrir pago despues del checkout | Implementado | Frontend abre el modal de pago al crear el pedido | Modal de pago visible despues de confirmar carrito |
| Usar el total real del pedido como monto | Implementado | Backend asigna `monto = pedido.total_compra` | Respuesta API comparando monto y total |
| Cambiar pedido a `Pagado` si el pago es aprobado | Implementado | `test_hu_05.ps1` valida `pedido_estado = Pagado` | Panel de pedidos con badge `Pagado` |
| Generar factura con `ruc_nit_cliente` | Implementado | Pago aprobado crea registro en `factura` | Comprobante con numero de factura y RUC/NIT |
| Generar numeracion fiscal controlada | Implementado | Nuevas facturas usan `NG-FE-YYYY-000001` segun `INVOICE_PREFIX` | Comprobante con numero de factura |
| Descargar comprobante PDF formal | Implementado | `GET /api/v1/pagos/facturas/{factura_id}/pdf` devuelve `application/pdf` | PDF descargado desde el boton `Descargar PDF` |
| Incluir datos fiscales completos | Implementado | PDF incluye emisor, NIT, direccion, cliente, RUC/NIT, direccion fiscal, pedido e items | PDF abierto con datos fiscales |
| Enviar comprobante por correo | Implementado | `POST /api/v1/pagos/facturas/{factura_id}/email` envia por SMTP si esta configurado o simula envio si no | Boton `Enviar por correo` |
| Evitar pago aprobado duplicado | Implementado | Prueba valida HTTP 409 al repetir pago aprobado | Swagger con error 409 |
| Registrar pago rechazado sin factura | Implementado | Pago `Rechazado` conserva pedido `Pendiente` y no crea factura | Respuesta API de pago rechazado |
| Permitir consultar comprobante | Implementado | `GET /api/v1/pagos/pedido/{pedido_id}` | Boton `Comprobante` en pedido pagado |

## Endpoints implementados

| Metodo | Ruta | Uso |
| --- | --- | --- |
| POST | `/api/v1/pagos` | Registrar pago de un pedido propio |
| GET | `/api/v1/pagos/mis-pagos` | Listar pagos del cliente autenticado |
| GET | `/api/v1/pagos/pedido/{pedido_id}` | Consultar pago/factura de un pedido propio |
| GET | `/api/v1/pagos/facturas/{factura_id}/pdf` | Descargar factura formal en PDF |
| POST | `/api/v1/pagos/facturas/{factura_id}/email` | Enviar factura por correo |

## Reglas de negocio

- El usuario debe estar autenticado con JWT.
- El cliente solo puede pagar pedidos asociados a su propia cuenta.
- El monto no se recibe desde frontend; se toma desde `pedido.total_compra`.
- Los pedidos solo se pagan si estan en estado `Pendiente`.
- Un pedido con pago aprobado no acepta otro pago aprobado.
- Un pago `Aprobado` cambia el pedido a `Pagado` y genera factura.
- Un pago `Rechazado` queda registrado, pero no cambia el pedido ni genera factura.
- El RUC/NIT acepta letras, numeros, punto y guion, con longitud de 5 a 45 caracteres.
- El PDF se genera desde backend con los datos del pedido, cliente, pago y factura.
- El envio por correo usa SMTP si `SMTP_HOST` esta configurado; sin SMTP responde en modo `simulado`.

## Checklist de capturas para el manual

1. Pedido creado en estado `Pendiente`.
2. Boton `Pagar` en la tabla de pedidos recientes.
3. Modal de pago con metodo y RUC/NIT.
4. Toast de pago aprobado.
5. Comprobante con monto, metodo, factura, RUC/NIT, cliente y datos de emisor.
6. Pedido actualizado a estado `Pagado`.
7. Swagger de `POST /api/v1/pagos`.
8. PDF descargado.
9. Boton de envio por correo.
10. Consulta SQL de registros en `pago`.
11. Consulta SQL de registros en `factura`.

## Restaurar stock demo

Si las pruebas o capturas agotan productos del catalogo, restaurar cantidades demo con:

```powershell
cd C:\Users\jebus\OneDrive\Documentos\NEO_GEST
powershell -ExecutionPolicy Bypass -File 4_pruebas\pruebas\reset_stock_demo.ps1
```

## Estado para avanzar

HU-05 queda lista para cierre funcional y documentacion con comprobante formal descargable. El pago sigue siendo una simulacion controlada; para produccion real faltaria integrar una pasarela bancaria, webhooks, conciliacion, idempotency keys externas y validacion fiscal externa segun el pais.
