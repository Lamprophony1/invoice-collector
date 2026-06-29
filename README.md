# invoice-collector

Automatizacion de facturas electronicas con Google Apps Script.

Este proyecto procesa correos de Gmail que contienen facturas electronicas, identifica adjuntos XML y PDF, extrae los datos fiscales desde el XML, guarda los archivos en Google Drive y registra la informacion en Google Sheets.

## Para continuar el trabajo

Leer primero [Contexto activo](docs/context.md). Ese archivo es la fuente viva para saber el estado actual y el proximo paso unico.

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
- **Google Apps Script**: logica de automatizacion.
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

- [Contexto activo](docs/context.md)
- [Overview](docs/overview.md)
- [Setup](docs/setup.md)
- [Decisions](docs/decisions.md)
- [History](docs/history/)
