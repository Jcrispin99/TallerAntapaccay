# Evaluación CM

Plataforma de cursos con evaluaciones tipo Google Forms.

- **Alumnos** (sin cuenta): ingresan su **DNI** una vez y ven *Mis talleres* con el estado de cada uno (pendiente, en curso, listo para rendir, aprobado…). Ven el material (videos o presentaciones, con modo cine y pantalla completa) y rinden la evaluación, una pregunta por pantalla. Solo pueden entrar los DNI que están en la **lista de alumnos**.
- **Profesores** (`/admin`, con correo y contraseña): crean sus cursos, suben material, arman la evaluación (tipo de pregunta, opciones, respuesta correcta y puntos), ven resultados, califican respuestas abiertas y exportan a CSV. **Cada profesor ve solo sus cursos.**
- **Administradores**: ven y editan todos los cursos, pueden pasar un curso a otro profesor, gestionan las cuentas en *Profesores* (crear, cambiar contraseña, desactivar, eliminar) y la lista de *Alumnos*.

Stack: Laravel 13 (API en `/api/v1`) + React 19 con [shadcn/ui](https://ui.shadcn.com) (SPA en `resources/js`), Tailwind v4, TanStack Query, react-hook-form + zod.

## Requisitos

- PHP 8.4+, Composer, Node 22+ (por ejemplo con [Laravel Herd](https://herd.laravel.com))
- **LibreOffice**, para convertir PPT/PPTX/ODP a PDF y que se vean en el navegador:
  ```bash
  brew install --cask libreoffice
  ```
  Sin LibreOffice, las presentaciones quedan con estado "Error" y el alumno solo puede descargarlas. Los PDF y los videos no lo necesitan.
- **FFmpeg**, para que los videos empiecen a reproducirse mientras cargan (ver *Videos que tardan en empezar*):
  ```bash
  brew install ffmpeg         # macOS
  sudo apt install ffmpeg     # Ubuntu
  ```
  Sin FFmpeg los videos se ven igual, pero los que tienen el índice al final tardan en empezar.
- **Límites de subida**: el panel sube los archivos en partes de 20 MB (ver *Subida por partes*), así que PHP (`upload_max_filesize`, `post_max_size`) y nginx (`client_max_body_size`) solo necesitan aceptar unos 25 MB por envío. El tamaño máximo de cada archivo lo fijan `MAX_VIDEO_MB` y `MAX_PRESENTATION_MB`. Quien use la API directamente con el campo `file` necesita que PHP y nginx acepten el archivo completo.

## Instalación

```bash
composer install
npm install
cp .env.example .env
php artisan key:generate
touch database/database.sqlite
php artisan migrate
php artisan storage:link
```

Crea el primer administrador (el resto de cuentas se crean desde el panel, en *Profesores*):

```bash
php artisan app:create-admin tu@correo.com --name="Tu nombre"   # pide la contraseña
```

| Variable | Para qué |
|---|---|
| `LIBREOFFICE_PATH` | Ruta al binario `soffice` |
| `LIBREOFFICE_TIMEOUT` | Segundos máximos por conversión |
| `FFMPEG_PATH` | Ruta al binario `ffmpeg` (por defecto, el que esté en el PATH) |
| `MAX_VIDEO_MB` / `MAX_PRESENTATION_MB` | Tamaño máximo por archivo |
| `APP_TIMEZONE` | Zona horaria de las fechas (por ejemplo `America/Lima`) |

## Desarrollo

```bash
composer dev   # cola (conversiones PPT→PDF) + Vite con recarga en caliente
```

Herd sirve la app en `http://evaluacioncm.test`. Sin `composer dev`, ejecuta `npm run build` para generar los assets y `php artisan queue:work` para procesar las conversiones.

- Alumnos: `http://evaluacioncm.test/`
- Admin: `http://evaluacioncm.test/admin`
- Documentación de la API: `http://evaluacioncm.test/docs/api`

Para agregar componentes de shadcn: `npx shadcn@latest add <componente>` (se instalan en `resources/js/components/ui`).

## Calidad

```bash
composer test       # Pint + Rector (dry-run) + PHPStan nivel max + Pest
npm run typecheck   # TypeScript
```

## Cuentas

- Se ingresa con correo y contraseña. La sesión dura 7 días o hasta cerrar sesión (tokens de Sanctum).
- Cada profesor puede cambiar su contraseña desde el menú de su nombre. Si un admin le cambia la contraseña o desactiva la cuenta, se le cierran todas sus sesiones.
- Al eliminar a un profesor, sus cursos pasan al admin que lo elimina. Si solo quieres impedir que ingrese, desactiva la cuenta.
- Un admin no puede quitarse el rol, desactivarse ni eliminarse a sí mismo, así que siempre queda al menos uno.
- Login limitado a 5 intentos por minuto por correo e IP.

## Lista de alumnos

- En *Alumnos* (solo admins) se importa un Excel (.xlsx) o .csv. La primera fila debe tener los títulos **DNI**, **Nombre** (o "Apellidos y Nombres", o columnas "Nombres" y "Apellidos" separadas), **Gerencia** y **Puesto** (o "Cargo"), en cualquier orden. Hay una plantilla para descargar.
- Reimportar actualiza a los alumnos existentes (por DNI) y agrega los nuevos. No borra a nadie: para quitar a alguien se usa el botón de eliminar.
- Los DNI numéricos se completan con ceros a 8 dígitos, porque Excel suele borrar el cero inicial. Lo mismo se hace con lo que escribe el alumno, así que ambos coinciden.
- Cada intento guarda una copia del nombre, la gerencia y el puesto del alumno en ese momento. Los resultados y el CSV mantienen esos datos aunque luego cambie o se quite de la lista.

## Material obligatorio antes de rendir

- Si un curso tiene material y evaluación, el alumno ingresa su DNI al entrar al curso. Su avance en cada material queda registrado, y el botón *Rendir evaluación* se habilita cuando lo termina todo. El servidor también lo exige al empezar un intento.
- **Videos:** se deben ver completos, a velocidad normal y en pantalla. Mientras no se completan, el reproductor no tiene pausa, ni barra para adelantar, ni cambio de velocidad: solo reproducir, volumen y pantalla completa. Si el alumno cambia de pestaña o de aplicación, o minimiza, el video se detiene y ese tiempo no cuenta; al volver, continúa desde donde quedó. El servidor solo acepta un avance posible en el tiempo real transcurrido (1x), así que hay que permanecer toda la duración del video. Una vez completado, el video se puede repasar con los controles normales.
- **Presentaciones:** cuentan como vistas al abrirlas (o al descargarlas, si no se pudieron convertir).
- **Enlaces:** el profesor también puede agregar un video o una página con su enlace (*Agregar enlace*). YouTube, Vimeo y Google Drive se muestran con su propio reproductor, un enlace a un .mp4 con el reproductor normal, y cualquier otra página dentro del curso. Cuentan como vistos al abrirlos: con el reproductor de afuera no se puede exigir verlos completos. Si la red del alumno bloquea esa página (por ejemplo, YouTube en la red de una empresa), no lo va a poder ver; los videos subidos se sirven desde la plataforma y no tienen ese problema.
- **Modo cine y pantalla completa:** sirven para videos y presentaciones. El modo cine ocupa todo el ancho de la ventana sin cortar el video; la pantalla completa mantiene los controles del video obligatorio.
- La duración de cada video se lee en el navegador del profesor al subirlo. El subidor avisa antes de enviar si el archivo supera `MAX_VIDEO_MB`.

## Subida por partes

Cloudflare corta cualquier envío de más de 100 MB, así que el panel no manda el archivo de una vez:

1. `POST /admin/courses/{course}/uploads` con el nombre y el tamaño: se valida el formato y el máximo antes de enviar nada, y devuelve un id.
2. `POST /admin/uploads/{id}/chunks` con cada parte de 20 MB y el byte donde empieza. El servidor la agrega al final y responde cuántos bytes tiene; la siguiente parte empieza ahí. Si una parte falla por la red o por un error momentáneo de Cloudflare, se reintenta, y una parte repetida no se agrega dos veces.
3. `POST /admin/courses/{course}/materials` con `upload: id` en lugar de `file`, cuando llegó todo.

Las partes se guardan en `storage/app/private/uploads`. Las subidas que quedan sin terminar se borran al día siguiente, cuando alguien empieza otra. Igual conviene grabar en 720p: cada alumno descarga el video completo.

## Videos que tardan en empezar

Un MP4 tiene un índice (la caja `moov`) que dice dónde está cada segundo. Muchos grabadores de pantalla y editores lo dejan al final del archivo, y entonces el navegador no puede empezar hasta llegar a él: en un video grande, uno o dos minutos de pantalla negra. Al subir un video, el job `OptimizeVideoForStreaming` lo mueve al principio con FFmpeg (`-movflags +faststart`), sin recomprimir: tarda segundos y no cambia la calidad. El archivo queda con un nombre nuevo, porque Cloudflare guarda en caché el anterior.

Para los videos subidos antes, o después de instalar FFmpeg:

```bash
php artisan app:optimize-videos
```

## Cómo se califica

- **Opción única / desplegable**: puntaje completo si elige la opción correcta.
- **Casillas**: todo o nada. Puntúa solo si marca exactamente las correctas.
- **Respuesta corta**: si hay respuestas aceptadas, se comparan sin importar mayúsculas, tildes ni espacios. Si no hay ninguna, se revisa a mano.
- **Párrafo**: siempre se revisa a mano. El intento queda "Pendiente de revisión" hasta calificarlo en *Resultados*.
- Una pregunta con 0 puntos no se califica (sirve, por ejemplo, para preguntas de encuesta).
- La nota es la suma de puntos. Aprueba si llega a la nota mínima. Los intentos se pueden limitar por DNI.
- Las respuestas correctas nunca se envían al navegador del alumno. Solo las ve después de enviar, y únicamente si la evaluación tiene activado "Mostrar respuestas correctas".

## Estructura

```
app/
  Enums/                  MaterialType, ConversionStatus, QuestionType, AttemptStatus
  Http/Controllers/Api/V1 API pública (catálogo, evaluación, intentos)
  Http/Controllers/Api/V1/Admin  API de administración
  Policies/CoursePolicy.php       cada profesor gestiona solo sus cursos; el admin, todos
  Console/Commands/CreateAdmin.php
  Jobs/ConvertPresentationToPdf.php
  Jobs/OptimizeVideoForStreaming.php  pone el índice de los videos al principio
  Services/EvaluationGrader.php    corrección y recálculo de notas
  Services/EvaluationFormSync.php  guarda el formulario completo del editor
  Services/StudentImporter.php     importa la lista de alumnos desde Excel/CSV
  Services/ChunkedUploads.php      junta los archivos que llegan por partes
resources/js/
  api/          cliente axios + hooks de TanStack Query
  pages/public  catálogo, curso, evaluación, resultado
  pages/admin   cursos y edición de curso (pestañas)
  components/admin  materiales, editor de evaluación, resultados
  components/ui     componentes de shadcn
```
