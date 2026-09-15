import type { Dictionary } from './types';

/** Spanish site copy. Terminology follows apps/extension/src/i18n/es.json. */
export const es: Dictionary = {
  'nav.methodology': 'Metodología',
  'nav.privacy': 'Privacidad',
  'nav.changelog': 'Novedades',
  'nav.addToChrome': 'Añadir a Chrome',
  'nav.skip': 'Saltar al contenido',
  'nav.main': 'Principal',
  'nav.language': 'Idioma',

  'meta.home.title':
    'Signalyze: un perfil de reseñas estadístico para cualquier negocio de Google Maps',
  'meta.home.description':
    'Una extensión gratuita de Chrome que muestra un perfil de reseñas estadístico para cualquier negocio de Google Maps: diez señales medibles combinadas en una Puntuación Signalyze de 0 a 100. Sin cuenta, sin rastreo.',
  'meta.methodology.title': 'Metodología',
  'meta.methodology.description':
    'Cómo se calculan cada una de las diez señales de Signalyze y la Puntuación Signalyze de 0 a 100, con fórmulas, umbrales y pesos.',
  'meta.privacy.title': 'Privacidad',
  'meta.privacy.description':
    'Exactamente qué hacen con los datos la extensión y la API de Signalyze: qué se envía, qué no se envía nunca, qué se guarda y durante cuánto tiempo.',
  'meta.changelog.title': 'Novedades',
  'meta.changelog.description':
    'Notas de las versiones de la extensión, la API y el sitio de Signalyze.',
  'meta.notFound.title': 'Página no encontrada',
  'meta.notFound.description': 'No hay ninguna página en esta dirección.',

  'hero.eyebrow': 'extensión gratuita de chrome · google maps',
  'hero.title': 'La estadística detrás de una puntuación en estrellas.',
  'hero.lead':
    'Signalyze convierte las reseñas que ya están en una página de Google Maps en un perfil de reseñas: diez señales medibles, desde la concentración temporal hasta la similitud de textos, combinadas en una Puntuación Signalyze de 0 a 100. Sin cuenta, sin rastreo.',
  'hero.methodology': 'Leer la metodología',
  'hero.readouts.label': 'Ejemplos de valores de señal',
  'hero.readouts.eyebrow': 'así se ve una señal',
  'hero.readouts.burst': 'de las reseñas se publicó dentro de una sola ventana de {days} días',
  'hero.readouts.single': 'de los reseñadores no tiene otra reseña',
  'hero.readouts.overlap': 'solapamiento medio de {n}-gramas de caracteres entre textos de reseñas',
  'hero.readouts.note':
    'Afirmaciones sobre la distribución de datos públicos. Cualquiera puede recalcularlas desde la misma página.',

  'how.eyebrow': '3 pasos',
  'how.title': 'Cómo funciona',
  'how.step1.title': 'Abre un negocio en Google Maps',
  'how.step1.text':
    'Cualquier página de negocio con al menos {min} reseñas. Signalyze no hace nada hasta que se lo pides.',
  'how.step2.title': 'Pulsa Analizar',
  'how.step2.text':
    'La extensión desplaza el panel de reseñas que Google ya ha mostrado y lee {limit} reseñas por defecto, o todas las reseñas de la página (hasta {ceiling}) y solo el periodo que elijas. Nunca abre otra página.',
  'how.step3.title': 'Lee el perfil de reseñas',
  'how.step3.text':
    'El panel lateral muestra la puntuación, las diez señales, las reseñas por mes, la distribución de puntuaciones y un resumen de los reseñadores, cada uno explicado en lenguaje sencillo.',

  'see.eyebrow': 'el panel lateral',
  'see.title': 'Qué ves',
  'see.score.title': 'Puntuación y diez señales',
  'see.score.text':
    'Una Puntuación Signalyze de 0 a 100 y, debajo, cada señal con su valor. Cada una tiene una explicación en lenguaje sencillo y un enlace a su fórmula.',
  'see.monthly.title': 'Reseñas por mes',
  'see.monthly.text':
    'Cuántas reseñas llegaron cada mes, para que una concentración se vea de un vistazo.',
  'see.rating.title': 'Distribución de puntuaciones',
  'see.rating.text':
    'Cómo se reparten las estrellas de 5 a 1. Una forma concentrada en ambos extremos se ve distinta de una forma uniforme.',
  'see.reviewers.title': 'Perfil de los reseñadores',
  'see.reviewers.text':
    'Cuántos reseñadores tienen solo esta reseña, cuántos son Local Guides consolidados y cuántos publicaron sin foto y con poco texto.',

  'shots.eyebrow': 'capturas de pantalla',
  'shots.title': 'Así se ve',
  'shots.alt': 'Captura de pantalla {n} de Signalyze',
  'shots.alt.score': 'El panel lateral con la Puntuación Signalyze y las diez señales',
  'shots.alt.signals': 'Una señal desplegada con su valor y su explicación',
  'shots.alt.charts': 'Gráficos de reseñas por mes y distribución de puntuaciones',
  'shots.alt.reviewers': 'El resumen de los reseñadores',
  'shots.alt.consent': 'La pantalla de consentimiento única antes del primer análisis',
  'shots.alt.settings': 'La pantalla de ajustes',

  'signals.eyebrow': '10 señales · motor {version}',
  'signals.title': 'Las diez señales',
  'signals.lead':
    'Cada señal es un valor entre 0 y 1 que expresa cuán inusual es la magnitud medida en comparación con lugares reseñados típicos. No se infiere nada sobre la intención; cada una es un hecho sobre la distribución de datos públicos.',
  'signals.more': 'Fórmulas, pesos y umbrales: <a href="{url}">metodología</a>.',

  'signal.burst_ratio.title': 'Concentración temporal',
  'signal.burst_ratio.description':
    'Proporción de reseñas que caen en la única ventana de {days} días más activa, en relación con la duración del historial de reseñas del lugar.',
  'signal.rating_polarity.title': 'Polaridad de las puntuaciones',
  'signal.rating_polarity.description':
    'Cuánto se concentra la distribución de puntuaciones en 5 y 1 estrellas frente a las de 2 a 4 estrellas.',
  'signal.single_review_accounts.title': 'Cuentas con una sola reseña',
  'signal.single_review_accounts.description':
    'Proporción de reseñadores cuyo perfil público muestra una reseña o ninguna además de esta.',
  'signal.no_photo_short_text.title': 'Sin foto, texto corto',
  'signal.no_photo_short_text.description':
    'Proporción de reseñas sin foto y con menos de {chars} caracteres de texto.',
  'signal.text_similarity.title': 'Similitud de textos',
  'signal.text_similarity.description':
    'Solapamiento medio de {n}-gramas de caracteres entre los textos de las reseñas y proporción de pares casi idénticos.',
  'signal.template_phrases.title': 'Frases de plantilla',
  'signal.template_phrases.description':
    'Con qué frecuencia los textos reutilizan frases hechas de un diccionario por idioma.',
  'signal.rating_text_mismatch.title': 'Discrepancia entre puntuación y texto',
  'signal.rating_text_mismatch.description':
    'Con qué frecuencia el tono del texto, medido con un léxico, no concuerda con la puntuación en estrellas.',
  'signal.date_entropy.title': 'Entropía de fechas',
  'signal.date_entropy.description':
    'Cómo de uniformemente se reparten las fechas de las reseñas en el tiempo; una entropía baja significa que las fechas están agrupadas.',
  'signal.local_guide_ratio.title': 'Proporción de Local Guides',
  'signal.local_guide_ratio.description':
    'Proporción de reseñadores con nivel {level} o superior de Local Guide.',
  'signal.owner_response_pattern.title': 'Patrón de respuestas del propietario',
  'signal.owner_response_pattern.description':
    'Proporción de reseñas con respuesta del propietario y cuán idénticas son esas respuestas.',

  'data.eyebrow': 'de docs/PRIVACY.es.md',
  'data.title': 'Qué envía y qué no envía nunca',
  'data.lead':
    'Nada sale de tu navegador hasta que pulsas Analizar, y solo después de haber aceptado la pantalla de consentimiento única. Si la rechazas, cada análisis se ejecuta localmente.',
  'data.sent.title': 'Se envía, una vez por análisis',
  'data.sent.1':
    'El identificador del lugar tomado de la URL de la página, usado como clave de caché.',
  'data.sent.2':
    'Por reseña: puntuación en estrellas, día del calendario (sin hora), texto, número público de reseñas del reseñador, número de fotos, nivel de Local Guide si se muestra y la respuesta del propietario si la hay.',
  'data.sent.3':
    'Por reseña: un hash unidireccional del identificador del reseñador, el identificador del lugar y una sal diaria generada en tu navegador, para poder contar reseñadores distintos sin saber quiénes son.',
  'data.sent.4': 'El número total de reseñas y la puntuación global que se muestran.',
  'data.sent.5': 'Idioma de la interfaz y versión de la extensión.',
  'data.never.title': 'No se envía nunca',
  'data.never.1':
    'Nombres de reseñadores, URL de perfil, avatares, identificadores de usuario ni ningún otro identificador de reseñador.',
  'data.never.2': 'Tu cuenta de Google, tu nombre o tu dirección de correo electrónico.',
  'data.never.3': 'Tu historial de navegación, otras pestañas, cookies o almacenamiento local.',
  'data.never.4':
    'Tu ubicación. La API ve la dirección IP de la solicitud, como cualquier servidor web; se usa en memoria para limitar la tasa de solicitudes y nunca se guarda.',
  'data.kept.title': 'Se conserva en el servidor',
  'data.kept.text':
    'El perfil calculado de cada lugar, durante {days} días. Dos contadores diarios sin identificadores.',
  'data.notStored.title': 'No se guarda nunca',
  'data.notStored.text': 'Texto de las reseñas, hashes de reseñadores y direcciones IP.',
  'data.google.title': 'Nunca se contacta',
  'data.google.text':
    'Google. La API no hace ninguna solicitud a ningún servicio de Google; lo garantizan una prueba automática y una protección en tiempo de ejecución.',
  'data.more': 'Todos los detalles, campo por campo: <a href="{url}">privacidad</a>.',

  'verdict.eyebrow': 'se muestra bajo cada puntuación',
  'verdict.title': 'No es un veredicto',
  'legal.summary':
    'Esta puntuación es un resumen estadístico de datos públicos de reseñas; no es una afirmación sobre el negocio ni sobre ningún reseñador.',
  'legal.noClaim':
    'Signalyze no hace ninguna afirmación sobre la exactitud de ninguna reseña ni sobre ningún negocio o reseñador.',
  'verdict.note1':
    'Sin calificación por letras y sin aprobado o suspenso. Un número de 0 a 100, mostrado siempre junto a la frase anterior.',
  'verdict.note2':
    'Cada señal aparece por separado con su fórmula en la página de metodología, para que puedas discrepar de la ponderación.',
  'verdict.note3':
    'Menos de {min} reseñas: ninguna puntuación, solo «datos insuficientes». Las muestras pequeñas producen proporciones extremas.',
  'verdict.note4':
    'Sin etiquetas por reseña, sin marcas, sin funciones de denuncia y sin comparaciones entre negocios con nombre.',

  'faq.eyebrow': '5 preguntas',
  'faq.title': 'Preguntas frecuentes',
  'faq.1.q': '¿Es gratis?',
  'faq.1.a': 'Sí. Signalyze es gratuito, sin nivel premium y sin anuncios.',
  'faq.2.q': '¿Necesita una cuenta?',
  'faq.2.a':
    'No. No hay cuentas, ni cookies, ni analítica, ni telemetría. Lo único que la extensión conserva son tus ajustes y una caché local de los perfiles que has visto, en tu propio navegador.',
  'faq.3.q': '¿Funciona sin conexión?',
  'faq.3.a':
    'Sí. Si no se puede contactar con la API de Signalyze, o si rechazas el envío de datos, el mismo motor de señales se ejecuta dentro de tu navegador. Esos resultados se etiquetan como «análisis sin conexión» para que sepas que no proceden de la caché compartida.',
  'faq.4.q': '¿Funciona en sitios distintos de Google Maps?',
  'faq.4.a':
    'Todavía no. La versión 0.1 funciona en las páginas de negocios de Google Maps. La compatibilidad con el panel de conocimiento de la Búsqueda de Google está prevista para la fase 2.',
  'faq.5.q': '¿Cómo se calcula la puntuación?',
  'faq.5.a':
    'Cada señal es un número entre 0 y 1 que indica cuán inusual es el valor medido en comparación con lugares reseñados típicos. La Puntuación Signalyze es una combinación ponderada de las señales que se pudieron calcular, en una escala de 0 a 100. Por debajo de {min} reseñas no se muestra ninguna puntuación. Todas las fórmulas y pesos están en la <a href="{url}">página de metodología</a>.',

  'cta.title': 'Lee el perfil y después decide.',
  'cta.text': 'Gratis, sin cuenta, y no se envía nada hasta que pulsas Analizar.',

  'footer.github': 'GitHub',
  'footer.trademark':
    'Google Maps y Local Guide son marcas de Google LLC y se mencionan solo para describir dónde funciona la extensión. Signalyze no está afiliado a Google.',

  'doc.source': 'fuente',
  'doc.changelogNote':
    'Las notas de las versiones se mantienen solo en inglés; la lista siguiente es el documento original.',
  'doc.fallbackNote':
    'Esta página aún no está disponible en {language}; se muestra el original en inglés.',

  'notFound.eyebrow': '404',
  'notFound.title': 'No hay nada en esta dirección.',
  'notFound.text':
    'Puede que la página se haya movido. Todo lo que hay en este sitio se puede alcanzar desde la página de inicio.',
  'notFound.home': 'Ir a la página de inicio',

  'mock.example': 'datos de ejemplo',
  'mock.place': 'Harbour Street Bakery',
  'mock.placeMeta': '4,6 ★ · 1.240 reseñas · 1.240 analizadas',
  'mock.scoreLabel': 'Puntuación Signalyze · de 0 a 100',
  'mock.signals': 'Señales',
  'mock.monthly': 'Reseñas por mes',
  'mock.months': 'S O N D E F M A M J J A',
  'mock.monthlyNote':
    '40 de las 80 reseñas del último año se publicaron dentro de una sola ventana de {days} días.',
  'mock.rating': 'Distribución de puntuaciones',
  'mock.reviewers': 'Reseñadores',
  'mock.reviewers.single': 'una sola reseña',
  'mock.reviewers.guides': 'Local Guide nivel {level}+',
  'mock.reviewers.noPhoto': 'sin foto, texto corto',
  'mock.caption': 'Panel lateral ilustrativo. El lugar y todas las cifras son datos de ejemplo.',
};
