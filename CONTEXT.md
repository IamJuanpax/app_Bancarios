# RehabMobile – Contexto del Proyecto (Versión Optimizada en Costos)

---

## 1. Visión General

RehabMobile es una aplicación móvil multiplataforma orientada al sector salud (rehabilitación). Su objetivo es conectar a un grupo cerrado de médicos con pacientes, gestionando turnos por cercanía geográfica y centralizando las historias clínicas.

La estética debe reflejar profesionalismo, modernidad y exclusividad (estética de clínica privada).

---

## 2. Especificaciones Técnicas

### Plataformas

* iOS
* Android
* Desarrollo Cross‑Platform con React Native (preferentemente con Expo para simplificar builds y notificaciones)

### Stack Recomendado (Optimizado en Costos)

#### Frontend

* React Native + Expo

#### Backend / Base de Datos

* Firebase

  * Firestore (Base de datos)
  * Firebase Auth (Autenticación privada)
  * Firebase Cloud Messaging (Push Notifications)

**Estrategia de Costos:**

* Utilizar inicialmente el plan gratuito (Spark Plan).
* Evitar listeners en tiempo real innecesarios.
* Usar consultas puntuales (getDocs) cuando no sea necesario tiempo real.
* Separar colecciones activas y archivadas para evitar documentos demasiado grandes.

#### Geolocalización

**Opción Principal (Costo 0):**

* Uso de coordenadas GPS.
* Cálculo de distancia con fórmula de Haversine en el dispositivo.
* No utilizar Distance Matrix API.

Esto permite validar la restricción de 400 metros sin consumir APIs pagas.

#### Mapas

Opciones:

1. Google Maps SDK (usar solo si se necesita experiencia premium).
2. Alternativa económica: OpenStreetMap con react-native-maps para evitar consumo pago.

Recomendación inicial: usar OpenStreetMap hasta que el producto escale.

#### Agenda

Opción recomendada para MVP:

* Calendario interno en Firestore.
* Exportación opcional en formato .ics si el médico desea sincronizar manualmente.

Evitar inicialmente integración directa con Google Calendar para reducir:

* Complejidad OAuth
* Tiempo de desarrollo
* Costos indirectos de mantenimiento

---

## 3. Requerimientos Funcionales (FR)

### FR1: Gestión de Usuarios y Acceso

Acceso Cerrado:

* Solo usuarios registrados por el administrador pueden ingresar.

Roles:

Admin:

* Crea pacientes.
* Gestiona médicos.
* Administra la red general.

Médico:

* Visualiza todos los pacientes.
* Acepta turnos.
* Edita historias clínicas.

---

### FR2: Gestión de Pacientes

Perfil de Paciente:

* Nombre
* Dirección
* Coordenadas (lat, lng)
* Teléfono

Historia Clínica:

* Registro evolutivo con entradas:

  * Fecha
  * Médico
  * Nota
  * Progreso

Visibilidad:

* Base compartida: todos los médicos pueden ver todos los pacientes.

Optimización:

* Mantener cada entrada de historia clínica como documento separado si crece demasiado.
* Evitar arrays extremadamente grandes dentro de un solo documento.

---

### FR3: Lógica de Cercanía (Core Feature)

Geofencing:

* Obtener ubicación actual del médico.
* Calcular distancia con fórmula Haversine.

Restricción:

* Bloqueo automático si distancia > 400 metros.

Ventajas:

* 0 consumo de APIs externas.
* Respuesta inmediata.
* Bajo costo operativo.

---

### FR4: Agenda y Notificaciones

Turnos:

* Guardados en Firestore.
* Estados: pendiente / aceptado / completado.

Notificaciones Push:

* Aviso cuando se crea o asigna turno.
* Recordatorio previo.

Implementación:

* Firebase Cloud Messaging + Expo Notifications.

Costo: gratuito en etapa inicial.

---

## 4. Estructura de Datos (Esquema Optimizado)

```
{
  "pacientes": {
    "paciente_id": {
      "nombre": "String",
      "direccion": "String",
      "coordenadas": { "lat": "Number", "lng": "Number" },
      "telefono": "String"
    }
  },
  "historia_clinica": {
    "entrada_id": {
      "paciente_id": "ID",
      "fecha": "Timestamp",
      "medico": "ID",
      "nota": "String",
      "progreso": "String"
    }
  },
  "turnos": {
    "turno_id": {
      "paciente_id": "ID",
      "medico_id": "ID",
      "fecha_hora": "Timestamp",
      "estado": "pendiente / aceptado / completado"
    }
  }
}
```

Separar historia_clinica como colección independiente mejora:

* Escalabilidad
* Rendimiento
* Costos de lectura

---

## 5. UI/UX & Diseño

Paleta de Colores:

* Base blanca/gris clara (#F8F9FA)
* Azul medianoche profundo
* Acentos en Turquesa Neón o Verde Esmeralda

Estilo:

* Bordes redondeados
* Sombras suaves (neomorfismo ligero)
* Tipografías modernas (Montserrat / Inter)

Vibe:

* Limpio
* Minimalista
* Profesional
* Alta gama

---

## 6. Estrategia de Costos – Resumen

Para operar prácticamente en costo 0:

* React Native + Expo
* Firebase Spark Plan
* Firestore optimizado
* Firebase Auth
* Firebase Cloud Messaging
* Haversine local
* OpenStreetMap
* Calendario interno propio

Evitar inicialmente:

* Distance Matrix API
* Integraciones complejas con Google Calendar
* Escucha en tiempo real innecesaria

---

## 7. Consideraciones de Seguridad

Como es una app médica:

* Implementar reglas estrictas de seguridad en Firestore.
* Validar roles en backend.
* No exponer datos sensibles innecesarios.
* Evaluar normativa local de protección de datos.

---

## 8. Roadmap Recomendado

Fase 1 – MVP económico

* Auth cerrado
* CRUD pacientes
* Historia clínica básica
* Turnos
* Validación 400m
* Notificaciones

Fase 2 – Escalamiento

* Optimización de consultas
* Analytics
* Integración opcional con Google Calendar
* Mejora visual premium

---