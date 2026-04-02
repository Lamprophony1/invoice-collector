# invoice-collector

Automatización de facturas electrónicas con Google Apps Script.

Este proyecto procesa correos de Gmail que contienen facturas electrónicas, identifica adjuntos XML y PDF, extrae los datos fiscales desde el XML, guarda los archivos en Google Drive y registra la información en Google Sheets.

## Flujo general

1. Buscar correos candidatos en Gmail.
2. Identificar adjuntos `.xml` y `.pdf`.
3. Leer y parsear el XML.
4. Crear o reutilizar la carpeta mensual en Google Drive.
5. Guardar PDF y XML.
6. Registrar los datos en Google Sheets.
7. Evitar duplicados.
8. Marcar el correo como procesado con una etiqueta de Gmail.

## Componentes

- **Gmail**: fuente de entrada de correos y adjuntos.
- **Google Apps Script**: lógica de automatización.
- **Google Drive**: almacenamiento documental por año/mes.
- **Google Sheets**: registro tabular de facturas procesadas.

## Decisiones clave

- El **XML** es la fuente principal de datos.
- El **PDF** se conserva como respaldo documental.
- La detección de adjuntos se hace por **extensión de archivo**.
- La carpeta mensual se determina por la **fecha de emisión** del XML.
- Los duplicados se controlan usando un **Unique Id**.
- Los correos procesados se marcan con la etiqueta `facturas/procesado`.

## Documentación

La documentación detallada del proyecto se encuentra en `docs/`.

## Estado

Proyecto en construcción incremental, validado paso a paso con pruebas manuales sobre Gmail, Drive y Sheets.

## Documentación

- [Overview](docs/overview.md)
- [Setup](docs/setup.md)
- [Decisions](docs/decisions.md)
- [Automation checkpoint — 2026-04-02](docs/history/2026-04-02-automation-checkpoint.md)
