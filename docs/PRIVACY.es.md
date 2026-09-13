# Privacidad

_Traducción del original en inglés, que es la versión de referencia._

_Última actualización: 2026-09-12. Esta página describe exactamente qué hacen con los datos la extensión Signalyze y la API de Signalyze. Está escrita para coincidir con el código; si el código cambia, esta página cambia con él._

## La versión corta

- Signalyze no tiene cuentas, ni cookies, ni analítica, ni telemetría.
- Nada sale de tu navegador hasta que pulsas **Analizar**, y solo después de haber aceptado la pantalla de consentimiento única.
- Lo que se envía es una copia reducida de las reseñas que ya son visibles en la página de Google Maps: puntuación en estrellas, día del calendario, texto de la reseña, número público de reseñas del reseñador, número de fotos y nivel de Local Guide. Los nombres de los reseñadores, los enlaces de perfil, los avatares y los identificadores de usuario no se envían nunca.
- El servidor conserva solo el perfil calculado (señales y puntuación) de cada lugar durante 7 días. Nunca guarda el texto de las reseñas y nunca contacta con Google.
- Si no se puede contactar con el servidor, el análisis se ejecuta por completo dentro de tu navegador.

## Qué lee la extensión

Cuando abres la página de un negocio en Google Maps y pulsas **Analizar**, la extensión lee el panel de reseñas que Google ya ha mostrado en tu pestaña. Desplaza el panel para cargar hasta 200 reseñas (o hasta 500 si eliges «Cargar más»). No visita ninguna otra página, no abre perfiles de reseñadores y no lee nada fuera de la página del negocio que estás viendo.

## Qué se envía a la API de Signalyze

Una solicitud por análisis, que contiene:

| Campo                                                        | Ejemplo                       | Por qué es necesario                                                                        |
| ------------------------------------------------------------ | ----------------------------- | ------------------------------------------------------------------------------------------- |
| Identificador del lugar (de la URL de la página)             | `0x14cab...:0x8e3f...`        | Clave de caché para no recalcular el mismo lugar para cada usuario                          |
| Por reseña: puntuación en estrellas                          | `5`                           | Señales sobre la forma de las puntuaciones                                                  |
| Por reseña: día del calendario                               | `2026-03-14`                  | Señales temporales (solo precisión de día; sin hora)                                        |
| Por reseña: texto                                            | «Buen café, personal amable.» | Señales de similitud de textos, frases de plantilla y concordancia entre puntuación y texto |
| Por reseña: número total de reseñas del reseñador            | `12`                          | Señales sobre el historial del reseñador                                                    |
| Por reseña: número de fotos adjuntas                         | `1`                           | Señal de foto/texto corto                                                                   |
| Por reseña: nivel de Local Guide, si se muestra              | `4`                           | Señales sobre el historial del reseñador                                                    |
| Por reseña: texto de la respuesta del propietario, si la hay | «Gracias por su visita.»      | Señal de patrón de respuestas del propietario                                               |
| Por reseña: un hash unidireccional                           | 64 caracteres hexadecimales   | Permite al motor contar reseñadores distintos sin saber quiénes son (ver más abajo)         |
| Número total de reseñas y puntuación global mostrados        | `1.240` / `4,4`               | Se muestran como contexto; sirven para indicar qué parte del total se analizó               |
| Idioma de la interfaz y versión de la extensión              | `es` / `0.1.0`                | Selecciona el diccionario de frases; compatibilidad                                         |

**El hash unidireccional.** Para cada reseña, la extensión calcula `sha256(reviewerId + placeId + dailySalt)`, donde la sal diaria es un valor aleatorio generado en tu navegador y renovado cada día. El servidor recibe solo el hash. No puede recuperar el identificador del reseñador a partir de él, no puede vincular al mismo reseñador entre dos lugares distintos y no puede vincular al mismo reseñador entre dos días distintos. El hash se usa solo durante el cálculo y se descarta al enviar la respuesta.

## Qué no se envía nunca

- Nombres de reseñadores, URL de perfil, avatares, identificadores de usuario ni ningún otro identificador de reseñador.
- Tu cuenta de Google, tu nombre, tu dirección de correo electrónico ni ninguna información sobre ti.
- Tu historial de navegación, el contenido de otras pestañas, cookies o almacenamiento local.
- Tu ubicación precisa. La API ve la dirección IP de la solicitud (como cualquier servidor web); no se guarda, ver «Registros».

## Qué guarda el servidor

| Datos                                                                                                                                                | Dónde                                            | Durante cuánto tiempo                                      |
| ---------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ | ---------------------------------------------------------- |
| Perfil calculado por lugar: valores de las señales, puntuación, recuentos mensuales, distribución de puntuaciones, resumen del perfil de reseñadores | PostgreSQL, indexado por identificador del lugar | 7 días; después se elimina                                 |
| Contadores diarios: número de análisis, número de aciertos de caché                                                                                  | PostgreSQL                                       | Indefinidamente (dos enteros por día, sin identificadores) |

El texto de las reseñas, los hashes de reseñadores y las direcciones IP **no** se guardan. El servidor realiza el cálculo en memoria y conserva solo el resultado.

## Registros

La API escribe una línea de registro de acceso por solicitud con el método, la ruta, el código de estado, la duración y una dirección anonimizada: el último octeto de las direcciones IPv4 se sustituye por 0 y las direcciones IPv6 se recortan a sus tres primeros grupos. Sin cadenas de consulta, sin cuerpos de solicitud. El proxy de borde del alojamiento que termina TLS enmascara las direcciones de la misma forma en sus registros operativos. Ambos registros viven en la salida del contenedor y se conservan brevemente para la resolución de problemas. La limitación de tasa (60 análisis por IP y hora) usa la dirección IP completa solo en memoria y nunca la escribe en ningún sitio.

## Qué guarda la extensión en tu navegador

- Tus ajustes (idioma, distintivo activado o desactivado, consentimiento para el envío de datos).
- Una caché local de los perfiles que has visto, para que volver a abrir un lugar sea instantáneo. Puedes vaciarla en cualquier momento desde Ajustes, y se elimina al desinstalar la extensión.

Todo se guarda en el `chrome.storage.local` propio de la extensión; nada se sincroniza con Google ni con nosotros.

## El servidor nunca contacta con Google

La API de Signalyze no hace solicitudes a Google, Google Maps ni ningún servicio de Google. Esto lo garantizan una prueba automática en el código que falla si aparece cualquier nombre de host de Google en el código fuente de la API, y una protección en tiempo de ejecución sobre el único cliente HTTP saliente de la API.

## Modelo de lenguaje opcional en el servidor (actualmente desactivado)

Una versión futura podría usar un modelo de lenguaje para producir un único valor **numérico** de «homogeneidad de escritura» cuando la señal de similitud de textos ya sea alta. Si se activara, enviaría como máximo 30 textos de reseñas, sin ningún dato de reseñadores, al punto de conexión del modelo configurado, y recibiría un solo número de vuelta. Nunca etiqueta reseñas individuales. Esta función está desactivada a menos que el operador la configure explícitamente, y esta página se actualizará antes de activarla.

## Permisos que solicita la extensión

| Permiso                               | Por qué                                                                                          |
| ------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Acceso a las páginas de Google Maps   | Para leer las reseñas de la página del negocio que estás viendo                                  |
| Acceso a `api.signalyze.veriskor.com` | Para enviar los datos reducidos de las reseñas y recibir el perfil                               |
| `storage`                             | Ajustes y caché local                                                                            |
| `activeTab`                           | Para saber qué página de negocio está abierta cuando pulsas el icono de la barra de herramientas |
| `sidePanel`                           | Para mostrar el perfil de reseñas junto a la página                                              |

## Tus opciones

- Rechazar la pantalla de consentimiento: la extensión ejecuta entonces cada análisis localmente en tu navegador y no envía nada.
- Desactivar más tarde el envío de datos en Ajustes: mismo efecto.
- Vaciar la caché local en Ajustes.
- Desinstalar la extensión: elimina todos los datos locales. En el servidor, los perfiles se indexan por lugar, no por usuario, y caducan a los 7 días.

## Contacto

Las preguntas sobre esta página pueden enviarse a través del canal de contacto indicado en la ficha de Signalyze en Chrome Web Store.
