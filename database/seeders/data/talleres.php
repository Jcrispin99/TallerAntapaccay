<?php

declare(strict_types=1);

use App\Enums\QuestionType;

/*
|--------------------------------------------------------------------------
| Talleres de salud ocupacional 2026
|--------------------------------------------------------------------------
|
| Taken from the Word exams of each workshop (the correct answer is the one
| highlighted there). Each option maps to whether it is correct. Questions
| are single choice unless they set a type, and every exam adds up to 20.
|
*/

return [
    [
        'title' => 'Alimentación segura, resultados saludables',
        'description' => 'Cómo la alimentación influye en los análisis de sangre del examen médico anual (glucosa, colesterol, triglicéridos y ácido úrico) y qué hábitos ayudan a mejorarlos.',
        'questions' => [
            [
                'prompt' => '¿La alimentación influye en los resultados de nuestros análisis de sangre?',
                'points' => 4,
                'options' => [
                    'No influye' => false,
                    'Solo a veces' => false,
                    'Sí, influye directamente' => true,
                ],
            ],
            [
                'prompt' => '¿Cuál de los siguientes ayuda a mejorar los triglicéridos?',
                'points' => 4,
                'options' => [
                    'Comida rápida diaria' => false,
                    'Exceso de azúcar' => false,
                    'Actividad física regular' => true,
                    'Frituras' => false,
                ],
            ],
            [
                'prompt' => 'El ácido úrico puede aumentar por:',
                'points' => 4,
                'options' => [
                    'Consumir muchas verduras' => false,
                    'Tomar agua regularmente' => false,
                    'Exceso de carnes rojas y alcohol' => true,
                    'Actividad física' => false,
                ],
            ],
            [
                'prompt' => '¿La alimentación saludable significa dejar de comer?',
                'points' => 4,
                'options' => [
                    'Sí' => false,
                    'No, significa comer con equilibrio' => true,
                    'Solo comer ensaladas' => false,
                    'Comer una vez al día' => false,
                ],
            ],
            [
                'prompt' => '¿Cuál de los siguientes análisis puede verse afectado por lo que comemos?',
                'points' => 4,
                'options' => [
                    'Glucosa' => false,
                    'Colesterol' => false,
                    'Triglicéridos' => false,
                    'Todos los anteriores' => true,
                ],
            ],
        ],
    ],
    [
        'title' => 'Conservación auditiva',
        'description' => 'Programa de conservación auditiva: cómo el ruido daña el oído, las señales de alerta como el zumbido (tinnitus) y el uso correcto del protector auditivo.',
        'questions' => [
            [
                'prompt' => '¿Cuál es el objetivo principal de un Programa de Conservación Auditiva?',
                'points' => 4,
                'options' => [
                    'Reducir el estrés laboral' => false,
                    'Evitar accidentes por caídas' => false,
                    'Mejorar la comunicación radial' => false,
                    'Prevenir la pérdida auditiva por ruido y controlar la exposición' => true,
                ],
            ],
            [
                'prompt' => '¿Las células ciliadas del oído se pueden reparar luego de lesionarse por exposición a ruidos fuertes y prolongados sin uso de EPP?',
                'points' => 4,
                'options' => [
                    'Verdadero' => false,
                    'Falso' => true,
                ],
            ],
            [
                'prompt' => 'En una zona ruidosa, ¿qué práctica es correcta?',
                'points' => 4,
                'options' => [
                    'Retirar el EPP auditivo “solo un ratito” para hablar' => false,
                    'Usar un solo tapón' => false,
                    'Usar algodón en el oído' => false,
                    'Mantener el EPP auditivo puesto todo el tiempo en el área' => true,
                ],
            ],
            [
                'prompt' => '¿Cuál es un signo temprano frecuente de sobreexposición a ruido?',
                'points' => 4,
                'options' => [
                    'Dolor abdominal' => false,
                    'Zumbido (tinnitus) después del turno' => true,
                    'Fiebre' => false,
                    'Dolor de rodilla' => false,
                ],
            ],
            [
                'prompt' => '¿Qué comportamiento es más riesgoso?',
                'points' => 4,
                'options' => [
                    'Usar orejeras en maquinaria pesada' => false,
                    'Participar en capacitación' => false,
                    'Usar tapones y retirarlos para “descansar” cada 15 minutos' => true,
                    'Reportar tinnitus a salud ocupacional' => false,
                ],
            ],
        ],
    ],
    [
        'title' => 'Protección respiratoria',
        'description' => 'Programa de protección respiratoria: a quién está dirigido, las enfermedades por polvo respirable, la vigilancia médica (radiografía y espirometría) y las recomendaciones de cuidado.',
        'questions' => [
            [
                'prompt' => '¿Cuál es la población objetivo del Programa de Protección Respiratoria?',
                'points' => 5,
                'options' => [
                    'Población con estrés laboral' => false,
                    'Población operadora de equipos pesados' => false,
                    'Población expuesta a ruido laboral' => false,
                    'Población con exposición a material particulado respirable' => true,
                ],
            ],
            [
                'prompt' => 'Son daños a la salud por exposición a material particulado respirable, excepto:',
                'points' => 5,
                'options' => [
                    'Neumoconiosis' => false,
                    'Asma ocupacional' => false,
                    'EPOC ocupacional' => false,
                    'COVID-19' => true,
                    'Intoxicaciones agudas' => false,
                ],
            ],
            [
                'prompt' => 'Indique lo correcto sobre la vigilancia médica respiratoria:',
                'points' => 5,
                'options' => [
                    'Se realiza de manera anual (EMPO, EMA, RETIRO).' => false,
                    'Incluye radiografía de tórax.' => false,
                    'Incluye espirometría forzada.' => false,
                    'De encontrarse alguna alteración, se solicitarán nuevos controles.' => false,
                    'Todas las anteriores' => true,
                ],
            ],
            [
                'prompt' => 'Dentro de las recomendaciones, indique lo correcto:',
                'points' => 5,
                'options' => [
                    'No fumar' => false,
                    'Alimentación saludable' => false,
                    'Realizar ejercicios para fortalecer la musculatura respiratoria' => false,
                    'Todas las anteriores' => true,
                ],
            ],
        ],
    ],
    [
        'title' => 'Doble presencia y motivación',
        'description' => 'Qué es la doble presencia, cómo afecta el descanso y el tiempo con la familia durante la bajada, y por qué la motivación intrínseca es clave para la seguridad.',
        'questions' => [
            [
                'prompt' => '¿Qué significa la “doble presencia”?',
                'points' => 4,
                'options' => [
                    'Trabajar en dos empresas al mismo tiempo' => false,
                    'Estar físicamente en casa, pero pensando en el trabajo' => true,
                    'Tener dos turnos seguidos' => false,
                    'Vivir lejos de la familia' => false,
                    'Trabajar horas extras' => false,
                ],
            ],
            [
                'prompt' => '¿Cuál es una consecuencia de no manejar bien la doble presencia?',
                'points' => 4,
                'options' => [
                    'Mayor producción' => false,
                    'Mejor descanso' => false,
                    'Distracción y estrés' => true,
                    'Más tiempo libre' => false,
                    'Menos responsabilidades' => false,
                ],
            ],
            [
                'prompt' => '¿Qué acción ayuda a mejorar el tiempo de calidad con la familia durante la bajada?',
                'points' => 4,
                'options' => [
                    'Dormir todo el día' => false,
                    'Revisar constantemente el celular del trabajo' => false,
                    'Compartir tiempo y conversar sin distracciones' => true,
                    'Evitar hablar con la familia' => false,
                    'Mantener las mismas rutinas del campamento' => false,
                ],
            ],
            [
                'prompt' => '¿Qué es la motivación intrínseca?',
                'points' => 4,
                'options' => [
                    'Trabajar solo por el sueldo' => false,
                    'Hacer las cosas por obligación' => false,
                    'Motivarse por premios o castigos' => false,
                    'Motivarse por satisfacción personal y sentido del trabajo' => true,
                    'Trabajar solo cuando alguien supervisa' => false,
                ],
            ],
            [
                'prompt' => '¿Por qué la motivación intrínseca es importante para la seguridad?',
                'points' => 4,
                'options' => [
                    'Porque reduce los horarios' => false,
                    'Porque evita el trabajo en equipo' => false,
                    'Porque impulsa a cuidarse, aunque nadie esté mirando' => true,
                    'Porque elimina los riesgos' => false,
                    'Porque reemplaza los procedimientos' => false,
                ],
            ],
        ],
    ],
    [
        'title' => 'Materiales peligrosos e higiene ocupacional',
        'description' => 'Materiales peligrosos (MATPEL) y su Ficha de Datos de Seguridad (FDS), el GEAL, la evaluación de riesgos a la salud (HRA) y el uso correcto del respirador y los protectores auditivos.',
        'questions' => [
            [
                'prompt' => '¿Qué es una FDS?',
                'points' => 3,
                'options' => [
                    'Es la hoja técnica del producto.' => false,
                    'Es la Ficha de Datos de Seguridad.' => true,
                    'Es el sistema de identificación de materiales peligrosos.' => false,
                ],
            ],
            [
                'prompt' => '¿Cuántas secciones tiene una FDS?',
                'points' => 3,
                'options' => [
                    'Tiene 16 secciones.' => true,
                    'Tiene 14 secciones.' => false,
                    'Tiene 15 secciones.' => false,
                ],
            ],
            [
                'prompt' => 'Como usuario, ¿cuáles son mis responsabilidades en la manipulación de MATPEL?',
                'points' => 3,
                'options' => [
                    'Leer la FDS de cada MATPEL antes de usarlo.' => false,
                    'Seguir los procedimientos para el manejo de MATPEL.' => false,
                    'No usar envases vacíos de alimentos o gaseosas.' => false,
                    'Verificar que todos los MATPEL que usan en su labor no tengan daños en su envase y/o derrame.' => false,
                    'Todas las anteriores.' => true,
                ],
            ],
            [
                'prompt' => '¿En qué secciones de la FDS se encuentra la información de incompatibilidad de un MATPEL?',
                'points' => 3,
                'options' => [
                    'Sección 2: Identificación de los peligros, Sección 13: Consideraciones para la disposición y Sección 14: Información para la transportación.' => false,
                    'Sección 2: Identificación de los peligros, Sección 7: Manejo y almacenamiento y Sección 10: Estabilidad y reactividad.' => true,
                    'Sección 9: Propiedades fisicoquímicas, Sección 7: Manejo y almacenamiento y Sección 10: Estabilidad y reactividad.' => false,
                ],
            ],
            [
                'prompt' => '¿Qué es el GEAL?',
                'points' => 2,
                'options' => [
                    'Es el Límite de Exposición Ocupacional.' => false,
                    'Es el Límite Máximo Permisible.' => false,
                    'Es el Nivel de Acción de Exposición de GLENCORE, donde el GEAL es menor o igual que el LEO.' => true,
                ],
            ],
            [
                'prompt' => '¿Qué es la Evaluación de Riesgos a la Salud (HRA)?',
                'points' => 2,
                'options' => [
                    'Solo es la evaluación cuantitativa de la exposición a los riesgos ocupacionales.' => false,
                    'Es la identificación de riesgos ocupacionales.' => false,
                    'Es la evaluación cualitativa y cuantitativa de los riesgos en salud.' => true,
                ],
            ],
            [
                'prompt' => '¿Qué debo tener en cuenta antes de utilizar mi respirador?',
                'points' => 2,
                'options' => [
                    'Conocer cuál es mi talla de respirador y saber cómo utilizarlo.' => false,
                    'Debo tener el rostro afeitado (sin barba) y el cabello corto o recogido.' => false,
                    'Debo revisar el estado de mi respirador y conocer a qué agente químico me expondré.' => false,
                    'Todas las anteriores.' => true,
                ],
            ],
            [
                'prompt' => '¿Qué debo tener en cuenta antes de utilizar mis protectores auditivos?',
                'points' => 2,
                'options' => [
                    'A) Conocer qué tipo de protección es la indicada para mi actividad.' => false,
                    'B) Tener mis manos limpias antes de colocarme los protectores auditivos.' => false,
                    'C) Lavar mis tapones de espuma un día antes de usarlos.' => false,
                    'D) Opciones A y B.' => true,
                    'E) Opciones A, B y C.' => false,
                ],
            ],
        ],
    ],
    [
        'title' => 'IRAS y EDAS',
        'description' => 'Infecciones respiratorias agudas (IRA) y enfermedades diarreicas agudas (EDA): qué son, cómo prevenirlas y qué hacer si te enfermas.',
        'questions' => [
            [
                'prompt' => '¿La infección respiratoria aguda (IRA) se define como una infección que afecta la vía respiratoria, con síntomas respiratorios como dolor de garganta, rinorrea, congestión nasal, tos, malestar general y alza térmica entre los 3 a 6 días posteriores al contagio?',
                'points' => 4,
                'options' => [
                    'Verdadero' => true,
                    'Falso' => false,
                ],
            ],
            [
                'prompt' => '¿Cómo puedo prevenir una infección respiratoria aguda (IRA)?',
                'points' => 4,
                'options' => [
                    'Vacunándome.' => false,
                    'Con un correcto lavado de manos.' => false,
                    'Usando mascarilla si estoy en contacto con un compañero o familiar que presente síntomas respiratorios.' => false,
                    'Todas las anteriores.' => true,
                ],
            ],
            [
                'prompt' => 'Si tengo una infección respiratoria aguda causada por un virus, ¿puedo tomar un antibiótico?',
                'points' => 4,
                'options' => [
                    'Verdadero' => false,
                    'Falso' => true,
                ],
            ],
            [
                'prompt' => '¿Qué debo hacer si presento una infección gastrointestinal?',
                'points' => 4,
                'options' => [
                    'Acudir a una farmacia a comprar medicamentos.' => false,
                    'Tomar cualquier medicamento que encuentre en mi casa.' => false,
                    'Prestarme medicamentos de mi compañero sin saber para qué sirven e ir a trabajar sin informar al área médica.' => false,
                    'Acudir a una consulta médica para iniciar un tratamiento adecuado.' => true,
                ],
            ],
            [
                'prompt' => '¿Cómo puedo prevenir una enfermedad diarreica aguda (EDA)?',
                'points' => 4,
                'options' => [
                    'Correcto lavado de manos.' => true,
                    'Consumiendo alimentos de dudosa procedencia.' => false,
                    'Consumiendo alimentos no cocidos y no desinfectados.' => false,
                    'Ninguna es la correcta.' => false,
                ],
            ],
        ],
    ],
    [
        'title' => 'Primeros auxilios: PAS y RCP',
        'description' => 'La conducta PAS, el uso responsable del traumakit y cómo reconocer y actuar ante una parada cardiorrespiratoria o una obstrucción de la vía aérea.',
        'questions' => [
            [
                'prompt' => 'P.A.S. se define como:',
                'points' => 4,
                'options' => [
                    'Proceso Administrativo Sancionador.' => false,
                    'Proteger Ayudar Socorrer.' => false,
                    'Procedimiento Avisar Socorrer.' => false,
                    'N.A.' => true,
                ],
            ],
            [
                'prompt' => 'Consideraciones en el uso de traumakits:',
                'points' => 4,
                'options' => [
                    'Tenerlo aperturado todo el tiempo para su uso.' => false,
                    'Emplearlo de forma responsable y adecuada ante un accidente.' => true,
                    'Su contenido permite hacer uso desmesurado.' => false,
                    'Solo usarlo en caso de simulacros.' => false,
                ],
            ],
            [
                'prompt' => 'Si una persona se encuentra en el piso, no responde, no respira y no tiene pulso, es:',
                'points' => 4,
                'options' => [
                    'Puede trasladarse de inmediato.' => false,
                    'Se realiza maniobra de Heimlich.' => false,
                    'Parada cardiorrespiratoria.' => true,
                    'N.A.' => false,
                ],
            ],
            [
                'prompt' => '¿Cómo identificar si una persona tiene obstrucción parcial de la vía aérea?',
                'points' => 4,
                'options' => [
                    'Cuando convulsiona.' => false,
                    'La pérdida de conocimiento y llevar a la víctima a un hospital.' => false,
                    'La persona lleva las manos al cuello y puede hablar con dificultad o presentar sonido.' => true,
                    'La persona no lleva las manos al cuello y se desmaya.' => false,
                ],
            ],
            [
                'prompt' => 'Cuando una persona sufre parada cardiorrespiratoria:',
                'points' => 4,
                'options' => [
                    'Se evalúa la escena hasta la llegada del respondedor de emergencia.' => false,
                    'Llamamos al CANAL 2 (RADIO), ANEXO 2222, CEL. 974215525 y esperamos.' => false,
                    'Se realiza RCP con secuencias de 100-120 compresiones torácicas (ciclos 30-c x 2-v).' => true,
                    'N.A.' => false,
                ],
            ],
        ],
    ],
    [
        'title' => 'Prevención de lumbalgia',
        'description' => 'Trastornos musculoesqueléticos: qué es la lumbalgia, sus causas y cómo prevenirla con buenas posturas, ejercicios de fortalecimiento y pausas activas.',
        'questions' => [
            [
                'prompt' => 'Con respecto a la lumbalgia, marque lo correcto:',
                'points' => 5,
                'options' => [
                    'Es un dolor que se localiza en la zona baja de la espalda.' => true,
                    'Interrupción de la continuidad de un hueso a causa de un traumatismo.' => false,
                    'Dolor agudo que se produce por lesión de un tendón.' => false,
                    'Son lesiones específicas que afectan los fibrocartílagos llamados meniscos en las rodillas.' => false,
                ],
            ],
            [
                'prompt' => 'Con respecto a las causas de la lumbalgia, es correcto:',
                'help_text' => 'Marca todas las que correspondan.',
                'type' => QuestionType::MultipleChoice,
                'points' => 5,
                'options' => [
                    'Cargar peso de manera inadecuada.' => true,
                    'Mantener un peso adecuado para la talla.' => false,
                    'Mantener malas posturas.' => true,
                    'Realizar actividades físicas.' => false,
                ],
            ],
            [
                'prompt' => 'Con respecto a las medidas generales para prevenir la lumbalgia, es correcto:',
                'points' => 5,
                'options' => [
                    'Mantener posturas ergonómicas.' => false,
                    'Realizar ejercicios de fortalecimiento de los músculos de la espalda.' => false,
                    'Realizar pausas activas.' => false,
                    'Todas las anteriores.' => true,
                ],
            ],
            [
                'prompt' => '¿A qué se refiere con pausas activas?',
                'points' => 5,
                'options' => [
                    'Actividad física exigente con sobreesfuerzo muscular.' => false,
                    'Actividad física realizada de 5 a 10 minutos cada 2 a 3 horas de la jornada laboral, que nos ayuda a recuperar energías.' => true,
                    'Son ejercicios de fuerza que puedes realizar en gimnasios.' => false,
                    'Estar por periodos largos de tiempo en una misma posición.' => false,
                ],
            ],
        ],
    ],
    [
        'title' => 'Síndrome metabólico',
        'description' => 'Qué es el síndrome metabólico, sus señales tempranas, los hábitos clave para trabajar en altura y las medidas para prevenirlo.',
        'questions' => [
            [
                'prompt' => '¿Qué es el síndrome metabólico?',
                'points' => 4,
                'options' => [
                    'Una sola enfermedad que siempre causa dolor.' => false,
                    'Un paquete de factores (cintura, glucosa, presión y grasas) que aumenta el riesgo de diabetes y eventos cardíacos.' => true,
                    'Solo colesterol alto.' => false,
                    'Una infección que se cura con antibióticos.' => false,
                ],
            ],
            [
                'prompt' => 'Son síntomas tempranos del síndrome metabólico, excepto:',
                'points' => 4,
                'options' => [
                    'Cansancio diurno + ronquido fuerte (sospecha de apnea).' => false,
                    'Aumento rápido de cintura/peso.' => false,
                    'Azúcar/presión/grasas alteradas.' => false,
                    'Dolor de cabeza severo + presión muy alta repetida.' => true,
                ],
            ],
            [
                'prompt' => '¿Cuáles son hábitos clave en altura?',
                'points' => 4,
                'options' => [
                    'Hidrátate de forma constante (orina clara es una guía).' => false,
                    'Evita alcohol los primeros días y limita energizantes.' => false,
                    'Camina/actívate suave al inicio (aclimatación progresiva).' => false,
                    'Controla tu presión si ya eres hipertenso.' => false,
                    'Todos los anteriores.' => true,
                ],
            ],
            [
                'prompt' => '¿Cuáles son medidas preventivas del síndrome metabólico?',
                'points' => 4,
                'options' => [
                    'Comida: menos grasa, más verdura; menos gaseosa, más jugos sin azúcar.' => false,
                    'Sueño: mínimo 6 horas; evitar pantallas y café antes de dormir.' => false,
                    'Actividad física: orientada a mejorar la salud; 30 minutos por día.' => false,
                    'Estrés: practicar técnicas de relajación y respiración profunda.' => false,
                    'Todas las anteriores.' => true,
                ],
            ],
            [
                'prompt' => '¿Cuál es una recomendación correcta de hábitos alimentarios?',
                'points' => 4,
                'options' => [
                    'Tomar gaseosa o energizantes con frecuencia para “mantener energía”.' => false,
                    'Elegir agua/infusiones sin azúcar y reducir embutidos/snacks y exceso de sal.' => true,
                    'Repetir porciones de arroz/pan/papa “porque trabajo fuerte”.' => false,
                    'Priorizar frituras varias veces por semana.' => false,
                    'Pedir comida chatarra de Espinar si no me gusta el menú, “para eso trabajo”.' => false,
                ],
            ],
        ],
    ],
];
