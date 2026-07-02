# invoice-collector

Automatizacion de facturas electronicas con Google Apps Script.

Este proyecto procesa correos de Gmail que contienen facturas electronicas, detecta XML/PDF, extrae los datos desde el XML y registra la salida contable en Google Sheets.

## Para continuar el trabajo

Arrancar por: [Contexto activo](docs/context.md).
Ese archivo es el estado canónico.

## Flujo general

1. Buscar correos candidatos en Gmail.
2. Detectar adjuntos `.xml` y `.pdf` por extension.
3. Parsear el XML.
4. Guardar XML/PDF en `2- Contabilidad Rafael Garcia/<AAAA>/<MM - Mes>/`.
5. Registrar en `Resumen Facturas Electronicas <AAAA>` dentro de la carpeta del año.
6. Evitar duplicados por `Unique Id` en hojas mensuales.
7. Marcar el thread con etiqueta `facturas/procesado`.

## Estructura de salida contable

- Hoja anual por año.
- 12 hojas mensuales por libro (`Enero` a `Diciembre`).
- Formato de fecha visible: `dd/MM/yyyy` (sin hora).
- `Detalle` queda como respaldo histórico para migracion.

## Documentacion

- [Contexto activo](docs/context.md)
- [Overview](docs/overview.md)
- [Setup](docs/setup.md)
- [Decisions](docs/decisions.md)
- [History](docs/history/)
