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
- **Límites de subida**: las presentaciones pueden pesar 50 MB o más, y los videos aún más. PHP (`upload_max_filesize`, `post_max_size`) y nginx (`client_max_body_size`) deben permitir al menos `MAX_VIDEO_MB`. En Herd se cambia en *Settings → PHP → Max file upload size* (aquí ya está en 1 GB). En un servidor, configura lo mismo en su `php.ini` y en nginx.

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
- **Modo cine y pantalla completa:** sirven para videos y presentaciones. El modo cine ocupa todo el ancho de la ventana sin cortar el video; la pantalla completa mantiene los controles del video obligatorio.
- La duración de cada video se lee en el navegador del profesor al subirlo. El subidor avisa antes de enviar si el archivo supera `MAX_VIDEO_MB`. En producción el límite es de 100 MB, porque Cloudflare corta las subidas más grandes: graba en 720p o comprime el video.

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
  Services/EvaluationGrader.php    corrección y recálculo de notas
  Services/EvaluationFormSync.php  guarda el formulario completo del editor
  Services/StudentImporter.php     importa la lista de alumnos desde Excel/CSV
resources/js/
  api/          cliente axios + hooks de TanStack Query
  pages/public  catálogo, curso, evaluación, resultado
  pages/admin   cursos y edición de curso (pestañas)
  components/admin  materiales, editor de evaluación, resultados
  components/ui     componentes de shadcn
```
