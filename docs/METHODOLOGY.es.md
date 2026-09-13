# Metodología

_Traducción del original en inglés, que es la versión de referencia._

_Versión del motor 1.1.0. Este documento es la única fuente de verdad sobre cómo se calculan cada señal y la Puntuación Signalyze. La página `/methodology` del sitio se genera a partir de él, y el código de `packages/signals` (TypeScript) y `apps/api/signalyze_api/engine` (Python) implementa exactamente lo que aquí se describe; ambas implementaciones se contrastan con los mismos datos de prueba._

Signalyze calcula diez señales deterministas a partir de las reseñas visibles en la página de un negocio en Google Maps. Cada señal es un número entre 0 y 1 que expresa cuán inusual es el valor medido en comparación con el aspecto de los lugares reseñados típicos; 0 significa «nada destacable» y 1 significa «tan inusual como lo más inusual que vemos». La Puntuación Signalyze (0-100) es una combinación ponderada de las señales que se pudieron calcular. No interviene ningún modelo de lenguaje y no se infiere nada sobre la intención: cada señal es un hecho sobre la distribución de datos públicos que cualquiera puede recalcular desde la misma página.

**Esta puntuación es un resumen estadístico de datos públicos de reseñas; no es una afirmación sobre el negocio ni sobre ningún reseñador.**

## Entrada

El motor recibe, por reseña: puntuación en estrellas (1-5), día del calendario, texto, número público de reseñas del reseñador (si es visible), número de fotos, nivel de Local Guide (si es visible) y texto de la respuesta del propietario (si la hay). Nunca recibe nombres, enlaces de perfil ni identificadores de usuario. Ver [Privacidad](/es/privacy).

La extensión carga hasta 200 reseñas (500 con «Cargar más») en el orden «Más relevantes» predeterminado de Google, así que la muestra es la parte del historial de reseñas que Google decidió mostrar primero, no una muestra aleatoria ni cronológica. Las señales se calculan sobre esa muestra y el panel lateral siempre indica cuántas reseñas se analizaron del total mostrado.

## Preprocesamiento

- **Las fechas** se extraen de las etiquetas relativas («hace 2 semanas») en el navegador y se redondean a un día del calendario. La resta de meses se basa en el calendario, por lo que «hace 3 meses» el 31 de mayo es el 28 o el 29 de febrero.
- **Normalización del texto**: Unicode NFKC, minúsculas, cada carácter que no sea letra, dígito o espacio en blanco se convierte en un espacio, los espacios se colapsan y se recortan los extremos. Las longitudes se cuentan en puntos de código Unicode.
- **El idioma de un texto** se decide en dos pasos. Primero cuenta la escritura de sus letras: cualquier kana lo hace japonés, cualquier hangul coreano, cualquier carácter han (sin kana) chino, cualquier letra árabe árabe. Los textos en cirílico votan después entre ruso y ucraniano, y los textos en alfabeto latino entre inglés, español, portugués, francés, alemán, italiano, turco, neerlandés, polaco, indonesio, vietnamita y sueco, usando pequeñas listas de palabras vacías (gana el que tenga más coincidencias; los empates se resuelven en ese orden, y un texto sin ninguna coincidencia es ruso o inglés, respectivamente). Los textos en otras escrituras (tailandés, devanagari, griego, hebreo, ...) no reciben diccionario. El idioma solo determina qué diccionario de frases y qué léxico de tono se aplican; nunca se comunica.
- Las reseñas se procesan en un orden fijo, las sumas se acumulan en ese orden y cada número comunicado se redondea al alza a seis decimales, de modo que las implementaciones en TypeScript y Python producen resultados idénticos.

## De una medición a la «rareza»

Cada señal produce una medición bruta (casi siempre una proporción entre 0 y 1) y la convierte en rareza con una rampa lineal entre dos puntos de calibración:

```
unusualness = clamp((value - low) / (high - low), 0, 1)
```

`low` es el nivel a partir del cual la señal empieza a contar (los lugares típicos están en ese nivel o por debajo) y `high` es el nivel a partir del cual cuenta por completo. Los puntos de calibración están en `packages/signals/data/thresholds.json` y se enumeran por señal más abajo. Son estimaciones de la versión 1.1.0 del motor, elegidas a partir de la forma de los datos públicos de reseñas de Google Maps y de conjuntos de datos sintéticos; se revisarán con nuevas versiones del motor y cada revisión quedará registrada en las novedades.

## Las señales

### 1. `burst_ratio` (peso 0,16)

**Mide:** la proporción de reseñas que caen dentro de la única ventana de 14 días más activa.

**Cómo:** ordenar los días de las reseñas; deslizar una ventana de 14 días y tomar el recuento máximo; `peakShare = peak / n`. Un flujo uniforme a lo largo de la vida del lugar pondría `expectedShare = 14 / lifespanDays` reseñas en cualquier ventana, así que el exceso por encima de eso es `excess = (peakShare - expectedShare) / (1 - expectedShare)`. Si todo el historial cabe en 14 días no hay nada con qué comparar y el exceso es 0.

**Rampa:** `excess` de 0,05 a 0,65.

**Por qué importa:** en los lugares consolidados el flujo de reseñas se reparte en el tiempo; que una gran parte de todas las reseñas llegue en dos semanas es medible y poco frecuente. Los detalles incluyen las fechas de la ventana para que pueda comprobarse en la página.

### 2. `rating_polarity` (peso 0,08)

**Mide:** la proporción de puntuaciones de 5 estrellas más las de 1 estrella entre todas las puntuaciones.

**Cómo:** `share = (count5 + count1) / n`.

**Rampa:** de 0,82 a 0,96. Las puntuaciones de Google están muy sesgadas hacia las 5 estrellas, así que una proporción de polaridad alta es normal; solo cuentan las distribuciones que evitan casi por completo las de 2 a 4 estrellas.

**Por qué importa:** una distribución concentrada en ambos extremos difiere de la forma uniforme y cargada hacia el 5 que tienen la mayoría de lugares.

### 3. `single_review_accounts` (peso 0,14)

**Mide:** la proporción de reseñadores cuyo número público de reseñas es 0 o 1.

**Cómo:** entre las reseñas en las que el recuento es visible, `share = count(reviewCount <= 1) / known`. Requiere al menos 15 recuentos conocidos; si no, no está disponible.

**Rampa:** de 0,30 a 0,75.

**Por qué importa:** la mayoría de los reseñadores de Google ha escrito más de una reseña. Una gran proporción de reseñadores cuya única reseña es esta es una diferencia medible respecto a esa base.

### 4. `no_photo_short_text` (peso 0,08)

**Mide:** la proporción de reseñas sin foto y con menos de 40 caracteres de texto.

**Cómo:** `share = count(photoCount == 0 and textLength < 40) / n`.

**Rampa:** de 0,60 a 0,95. Las reseñas solo con puntuación son habituales en Google, así que solo cuenta una proporción muy alta.

**Por qué importa:** las fotos y los textos largos requieren esfuerzo; su ausencia casi total es medible.

### 5. `text_similarity` (peso 0,16)

**Mide:** cuánto se solapan los textos de las reseñas entre sí.

**Cómo:** para cada reseña con al menos 20 caracteres de texto normalizado, construir el conjunto de 3-gramas de caracteres (espacios incluidos). Para cada par, calcular la similitud de Jaccard `|A ∩ B| / |A ∪ B|`. Comunicar la media de todos los pares y la proporción de pares por encima de 0,5 («pares casi idénticos»). Requiere al menos 10 textos válidos.

**Rampa:** el mayor entre la media de Jaccard de 0,18 a 0,45 y la proporción de pares casi idénticos de 0,02 a 0,15.

**Por qué importa:** los textos escritos de forma independiente sobre el mismo lugar comparten algunas palabras, pero muy pocos fragmentos a nivel de 3-gramas. Un solapamiento alto es medible sea cual sea el idioma.

### 6. `template_phrases` (peso 0,08)

**Mide:** la proporción de reseñas cuyo texto consiste sobre todo en frases hechas.

**Cómo:** por idioma, un diccionario de frases hechas habituales («highly recommend», «kesinlikle tavsiye ederim», «sehr zu empfehlen», «muy recomendable», «je recommande», «また来たい», «强烈推荐», ...) se compara con el texto normalizado respetando los límites de palabra; para el japonés y el chino, que se escriben sin espacios, las frases se buscan como subcadenas simples. Una reseña se basa en frases hechas cuando las frases coincidentes cubren al menos el 50 % de sus caracteres. `share = phraseBased / withText`. Requiere al menos 10 reseñas con texto. Los textos cuyo idioma no tiene diccionario cuentan en `withText`, pero nunca se basan en frases hechas. Se comunican las tres frases más frecuentes.

**Rampa:** de 0,15 a 0,50.

**Por qué importa:** las frases hechas también son habituales en reseñas cotidianas; por eso solo cuentan los textos formados mayoritariamente por ellas, y solo importa su proporción entre los textos.

### 7. `rating_text_mismatch` (peso 0,08)

**Mide:** con qué frecuencia el tono del texto no concuerda con la puntuación en estrellas.

**Cómo:** por idioma, un pequeño léxico de palabras positivas y negativas da `tone = (positive - negative) / (positive + negative)` sobre los tokens de una reseña. Para el japonés y el chino, las entradas del léxico se buscan como subcadenas del texto normalizado, primero las más largas; cada entrada cuenta una vez y se elimina antes de probar las más cortas, de modo que una forma negada como 不好吃 en la lista negativa no cuenta además como 好吃. Las reseñas sin ninguna coincidencia en el léxico y los textos cuyo idioma no tiene diccionario no se evalúan. Una discrepancia es una puntuación de 4 o 5 con tono ≤ -0,5, o una puntuación de 1 o 2 con tono ≥ 0,5. `share = mismatches / scored`. Requiere al menos 10 reseñas evaluadas.

**Rampa:** de 0,10 a 0,35. El léxico no maneja la negación ni la ironía, así que se espera una base de discrepancias que no cuenta.

**Por qué importa:** el texto y las estrellas suelen coincidir; una discrepancia sistemática es medible.

### 8. `date_entropy` (peso 0,08)

**Mide:** cómo de uniformemente se reparten las reseñas por los meses entre la primera y la última reseña.

**Cómo:** contar las reseñas por mes natural; entropía de Shannon `H = -Σ p_i log2 p_i` sobre los meses, normalizada por `log2(monthsInSpan)`. 1 significa perfectamente uniforme, 0 significa todo en un solo mes. Requiere un intervalo de al menos 3 meses. Se comunican el mes más activo y su proporción.

**Rampa:** `1 - normalisedEntropy` de 0,25 a 0,65.

**Por qué importa:** complementa a `burst_ratio` a escala de meses; los lugares estacionales tienen una entropía algo menor, que la rampa tolera.

### 9. `local_guide_ratio` (peso 0,06)

**Mide:** la proporción de reseñas escritas por Local Guides de nivel 3 o superior.

**Cómo:** solo se calcula cuando la página mostró un nivel para al menos un reseñador; si no, no está disponible, porque un nivel ausente no se puede distinguir de «no es Local Guide». `share = count(level >= 3) / n`. La dirección inusual es una proporción baja.

**Rampa:** déficit `0.20 - share` de 0 a 0,20 (proporción 0 → 1, proporción ≥ 0,20 → 0).

**Por qué importa:** los Local Guides consolidados forman parte habitual de la mezcla de reseñadores en la mayoría de lugares.

### 10. `owner_response_pattern` (peso 0,08)

**Mide:** cuán idénticas son las respuestas del propietario.

**Cómo:** entre las reseñas con respuesta del propietario, agrupar las respuestas normalizadas; `identicalShare = 1 - distinct / responded`. Requiere al menos 5 respuestas. Se comunican la tasa de respuesta y la proporción del grupo mayor.

**Rampa:** de 0,60 a 0,95. Muchos propietarios reutilizan una frase de agradecimiento, por eso solo cuenta la repetición casi total.

**Por qué importa:** es un aspecto pequeño y medible de cómo se gestiona la página; tiene un peso bajo.

## La Puntuación Signalyze

```
score = round( 100 × Σ (w_i × u_i) / Σ w_i )   over available signals i
```

Pesos (`packages/signals/src/weights.json`, versión 1.1.0):

| Señal                  | Peso |
| ---------------------- | ---- |
| burst_ratio            | 0.16 |
| text_similarity        | 0.16 |
| single_review_accounts | 0.14 |
| rating_polarity        | 0.08 |
| no_photo_short_text    | 0.08 |
| template_phrases       | 0.08 |
| rating_text_mismatch   | 0.08 |
| date_entropy           | 0.08 |
| owner_response_pattern | 0.08 |
| local_guide_ratio      | 0.06 |

Los pesos se renormalizan sobre las señales disponibles para el lugar, de modo que una señal que no se pudo calcular (por ejemplo, porque no se muestran los niveles de Local Guide) nunca mueve la puntuación en ninguna dirección. La puntuación es una media ponderada, así que una sola señal puede elevarla como máximo en la parte que le corresponde por su peso: un lugar con una concentración temporal extrema y nada más inusual queda en torno a 25, no a 90. Es intencionado; el panel lateral muestra cada señal por separado para que el lector vea cuál es la responsable.

**Sin puntuación por debajo de 15 reseñas.** Con menos reseñas, las proporciones anteriores oscilan enormemente, así que la extensión muestra «datos insuficientes» y ningún número.

## Cómo son los conjuntos de datos sintéticos

El motor incluye conjuntos de datos sintéticos con semilla fija que se usan en las pruebas y como datos de referencia entre implementaciones (`packages/signals/fixtures/`). Sus puntuaciones con el motor 1.1.0, a modo de orientación:

| Conjunto     | Descripción                                                                                                 | Puntuación                           |
| ------------ | ----------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| normal       | flujo constante durante tres años, puntuaciones mixtas, textos naturales                                    | 1-3                                  |
| polarized    | sobre todo puntuaciones de 5 y 1 estrellas                                                                  | 7-12                                 |
| burst        | el 60 % de las reseñas en una sola ventana de 14 días, sobre todo cuentas con una sola reseña               | 24                                   |
| template     | textos de frases hechas, casi duplicados, cuentas con una sola reseña, respuestas idénticas del propietario | 43-53                                |
| sparse       | solo puntuaciones, sin texto ni datos de reseñadores                                                        | 21 (solo cuatro señales disponibles) |
| multilingual | textos naturales y de frases hechas en los 18 idiomas cubiertos, más tailandés, hindi y griego              | 4                                    |

## Limitaciones

- La muestra es el orden «Más relevantes» de Google, no el historial completo.
- Las fechas relativas limitan la precisión a aproximadamente un día en las reseñas recientes y a un mes o un año en las antiguas.
- Los léxicos y los diccionarios de frases cubren 18 idiomas: inglés, español, portugués, francés, alemán, italiano, turco, neerlandés, polaco, indonesio, vietnamita, sueco, ruso, ucraniano, árabe, japonés, chino y coreano. Los textos en otros idiomas contribuyen a las señales temporales, de puntuación y de reseñadores, pero no a las señales de texto (un texto en alfabeto latino de un idioma no cubierto recurre a los diccionarios de inglés, que rara vez coinciden con él). Los diccionarios son pequeños y solo reconocen formas superficiales, sin lematización, tratamiento de la negación ni detección de ironía, por lo que los idiomas muy flexivos obtienen menos coincidencias por texto.
- Los niveles de Local Guide a menudo no se muestran en la lista de reseñas; en ese caso la señal no está disponible en lugar de estimarse.
- Los puntos de calibración son estimaciones de la versión 1.1.0. Cambiar cualquiera de ellos supone una nueva versión del motor, registrada en las novedades, y la caché del servidor se indexa por versión del motor.

## Modelo de lenguaje opcional (desactivado por defecto)

El motor 1.1.0 incluye un paso opcional en el servidor que el operador puede activar: cuando `text_similarity` ya es alta, se envían hasta 30 textos (sin datos de reseñadores) a un punto de conexión compatible con OpenAI que devuelve un solo número, una estimación de «homogeneidad de escritura» entre 0 y 1, comunicada en los detalles de `text_similarity` como `llmHomogeneity`. Nunca etiqueta reseñas individuales y nunca cambia la puntuación en esta versión. Está desactivado a menos que se configuren tanto `LLM_BASE_URL` como `LLM_API_KEY`; la API pública de Signalyze funciona actualmente con este paso desactivado.
