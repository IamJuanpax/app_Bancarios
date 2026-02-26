# RehabMobile 🏥

Aplicación móvil multiplataforma de rehabilitación médica. Conecta un grupo cerrado de médicos con pacientes, gestionando turnos por cercanía geográfica y centralizando las historias clínicas.

---

## 📋 Índice

- [Visión General](#-visión-general)
- [Stack Tecnológico](#-stack-tecnológico)
- [Estructura del Proyecto](#-estructura-del-proyecto)
- [Instalación](#-instalación)
- [Configuración de Firebase](#-configuración-de-firebase)
- [Arquitectura](#-arquitectura)
- [Pantallas y Flujos](#-pantallas-y-flujos)
- [Servicios](#-servicios)
- [Componentes](#-componentes)
- [Funciones Core](#-funciones-core)

---

## 🎯 Visión General

RehabMobile está diseñada para el sector salud (rehabilitación), con las siguientes características principales:

| Feature | Descripción |
|---------|-------------|
| **Acceso cerrado** | Solo usuarios registrados por el admin pueden ingresar |
| **Roles** | Admin (gestiona todo) y Médico (ve pacientes, acepta turnos) |
| **Historia clínica** | Registro evolutivo con entradas por fecha y médico |
| **Validación GPS** | Bloqueo automático si el médico está a más de 400m del paciente |
| **Agenda de turnos** | Estados: pendiente → aceptado → completado / cancelado |
| **Costo $0** | Firebase Spark Plan + cálculos locales + OpenStreetMap |

---

## 🛠 Stack Tecnológico

| Tecnología | Uso |
|-----------|-----|
| **React Native + Expo** | Framework mobile cross-platform |
| **Firebase Auth** | Autenticación con email/password |
| **Firestore** | Base de datos NoSQL (pacientes, turnos, historia clínica) |
| **expo-location** | GPS del dispositivo para geofencing |
| **Haversine (local)** | Cálculo de distancia sin APIs pagas |
| **React Navigation** | Navegación con Native Stack |
| **AsyncStorage** | Persistencia de sesión de Auth |

---

## 📁 Estructura del Proyecto

```
app_Bancarios/
├── App.js                          # Punto de entrada (carga fuentes + AuthProvider)
├── app.json                        # Configuración de Expo
├── package.json                    # Dependencias
├── CONTEXT.md                      # Documento de contexto/requerimientos
├── README.md                       # Esta documentación
│
├── assets/                         # Íconos y splash screen
│
└── src/
    ├── components/                 # Componentes reutilizables de UI
    │   ├── EmptyState.js           # Estado vacío para listas sin datos
    │   ├── LoadingSpinner.js       # Indicador de carga centrado
    │   ├── PatientCard.js          # Card de paciente con badge de distancia
    │   ├── StatCard.js             # Card de estadística para el dashboard
    │   └── TurnoCard.js            # Card de turno con badge de estado
    │
    ├── context/
    │   └── AuthContext.js          # Contexto global de autenticación
    │
    ├── navigation/
    │   └── AppNavigator.js         # Sistema de navegación condicional
    │
    ├── screens/                    # Pantallas de la app
    │   ├── LoginScreen.js          # Inicio de sesión
    │   ├── HomeScreen.js           # Dashboard principal
    │   ├── PacientesScreen.js      # Lista de pacientes
    │   ├── DetallePacienteScreen.js # Detalle + historia clínica
    │   ├── PacienteFormScreen.js   # Crear/Editar paciente
    │   ├── NuevaEntradaHistoriaScreen.js # Nueva entrada de HC
    │   ├── TurnosScreen.js         # Agenda de turnos
    │   ├── CrearTurnoScreen.js     # Crear nuevo turno
    │   └── DetalleTurnoScreen.js   # Detalle y gestión de turno
    │
    ├── services/                   # Servicios de datos (Firestore)
    │   ├── firebase.js             # Configuración de Firebase
    │   ├── pacientes.js            # CRUD de pacientes
    │   ├── historiaClinica.js      # CRUD de historia clínica
    │   └── turnos.js               # CRUD de turnos
    │
    ├── theme/
    │   └── index.js                # Tokens de diseño (colores, tipografía, etc.)
    │
    └── utils/
        └── haversine.js            # Cálculo de distancia geográfica
```

---

## 🚀 Instalación

```bash
# 1. Clonar el repositorio
git clone <url-del-repo>
cd app_Bancarios

# 2. Instalar dependencias
npm install

# 3. Iniciar Expo
npx expo start

# 4. Escanear el QR con Expo Go (Android) o la cámara (iOS)
```

---

## 🔥 Configuración de Firebase

1. Ir a [Firebase Console](https://console.firebase.google.com/)
2. Crear un nuevo proyecto (o usar uno existente)
3. Habilitar **Authentication** → Sign-in method → **Email/Password**
4. Crear una base de datos **Firestore** (modo test para desarrollo)
5. Copiar las credenciales del proyecto
6. Reemplazar en `src/services/firebase.js`:

```javascript
const firebaseConfig = {
  apiKey: "TU_API_KEY_REAL",
  authDomain: "TU_PROYECTO.firebaseapp.com",
  projectId: "TU_PROJECT_ID",
  storageBucket: "TU_PROYECTO.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123"
};
```

### Estructura de Firestore

Crear las siguientes colecciones:

**`usuarios`** (Para roles)
```json
{
  "uid_del_usuario": {
    "email": "medico@ejemplo.com",
    "nombre": "Dr. García",
    "rol": "medico"  // o "admin"
  }
}
```

**`pacientes`**
```json
{
  "paciente_id": {
    "nombre": "Juan Pérez",
    "direccion": "Av. Corrientes 1234",
    "coordenadas": { "lat": -34.6037, "lng": -58.3816 },
    "telefono": "11 2345-6789"
  }
}
```

**`historia_clinica`** (Colección independiente, NO sub-colección)
```json
{
  "entrada_id": {
    "paciente_id": "ID_DEL_PACIENTE",
    "medico": "UID_DEL_MEDICO",
    "medicoNombre": "Dr. García",
    "nota": "Paciente muestra mejoría...",
    "progreso": "mejora_leve",
    "fecha": "Timestamp"
  }
}
```

**`turnos`**
```json
{
  "turno_id": {
    "paciente_id": "ID",
    "pacienteNombre": "Juan Pérez",
    "medico_id": "UID",
    "medicoNombre": "Dr. García",
    "fecha_hora": "Timestamp",
    "estado": "pendiente"
  }
}
```

---

## 🏗 Arquitectura

### Flujo de Autenticación

```
App.js
└── AuthProvider (Context API)
    ├── usuario = null → LoginScreen
    └── usuario ≠ null → AppNavigator
        ├── Home (Dashboard)
        ├── Pacientes → DetallePaciente → NuevaEntradaHistoria
        └── Turnos → DetalleTurno
```

### Flujo de Datos

```
Pantalla (Screen)
    ↓ llama a
Servicio (services/*.js)
    ↓ consulta con
Firestore (getDocs / getDoc)
    ↓ retorna
Datos → Estado local (useState)
    ↓ renderiza
Componente de UI (components/*.js)
```

### Máquina de Estados de Turnos

```
   ┌─────────┐     Aceptar     ┌──────────┐    Completar    ┌─────────────┐
   │PENDIENTE│ ──────────────►  │ ACEPTADO │ ─────────────► │ COMPLETADO  │
   └─────────┘                  └──────────┘                 └─────────────┘
        │                            │
        │         Cancelar           │        Cancelar
        └──────────────┐─────────────┘
                       ▼
                 ┌───────────┐
                 │ CANCELADO │
                 └───────────┘
```

---

## 📱 Pantallas y Flujos

### 1. LoginScreen
- Autenticación con email y contraseña (Firebase Auth)
- Mensajes de error en español
- Estado de carga durante el login

### 2. HomeScreen (Dashboard)
- Saludo con rol del usuario (Admin/Médico)
- 3 StatCards: pacientes totales, turnos pendientes, completados
- Accesos rápidos a secciones principales
- Turnos del día actual
- Pull-to-refresh para recargar datos

### 3. PacientesScreen
- Lista completa de pacientes con búsqueda local
- Badge de distancia GPS (verde ≤400m, rojo >400m)
- FAB para agregar nuevo paciente (solo admin)

### 4. DetallePacienteScreen
- Perfil completo del paciente
- Banner de distancia GPS con validación de 400m
- Historia clínica evolutiva (entradas independientes)
- Bloqueo de nuevas entradas si el médico está fuera de rango
- Acciones: editar, eliminar (admin), crear turno

### 5. PacienteFormScreen
- Formulario reutilizado para crear y editar
- Captura de coordenadas GPS con expo-location
- Validación de campos obligatorios

### 6. NuevaEntradaHistoriaScreen
- Nota clínica con textarea multilínea
- Selector visual de progreso (chips con emojis)
- Médico se asigna automáticamente desde Auth

### 7. TurnosScreen (Agenda)
- Lista de todos los turnos
- Filtros por estado (chips: todos/pendientes/aceptados/completados)
- Vista diferenciada por rol (admin ve todos, médico ve los suyos)

### 8. CrearTurnoScreen
- Selector dropdown de pacientes
- Ingreso de fecha (DD/MM/AAAA) y hora (HH:MM)
- Paciente precargado si viene de DetallePaciente

### 9. DetalleTurnoScreen
- Banner de estado coloreado
- Información completa del turno
- Botones de acción dinámicos según estado actual
- Confirmación antes de cambiar estado

---

## ⚙️ Servicios

| Servicio | Archivo | Funciones |
|----------|---------|-----------|
| Firebase | `services/firebase.js` | `auth`, `db` (inicialización) |
| Pacientes | `services/pacientes.js` | `getPacientes`, `getPacienteById`, `createPaciente`, `updatePaciente`, `deletePaciente` |
| Historia Clínica | `services/historiaClinica.js` | `getHistoriaByPaciente`, `createEntradaHistoria`, `updateEntradaHistoria`, `deleteEntradaHistoria` |
| Turnos | `services/turnos.js` | `getTurnosByMedico`, `getTurnosByPaciente`, `getAllTurnos`, `createTurno`, `updateEstadoTurno`, `updateTurno` |

---

## 🧩 Componentes

| Componente | Props | Descripción |
|-----------|-------|-------------|
| `LoadingSpinner` | `message` | Spinner centrado con texto |
| `EmptyState` | `icon, title, message, actionLabel, onAction` | Estado vacío con CTA opcional |
| `StatCard` | `icon, value, label, color, onPress` | Card de métrica para dashboard |
| `PatientCard` | `paciente, distancia, onPress` | Card de paciente con badge de distancia |
| `TurnoCard` | `turno, onPress, showPatient, showDoctor` | Card de turno con badge de estado |

---

## 🌍 Funciones Core

### Haversine (src/utils/haversine.js)

| Función | Parámetros | Retorno |
|---------|-----------|---------|
| `calculateDistance` | `lat1, lon1, lat2, lon2` | `number` (metros) |
| `isWithinRange` | `currentLat, currentLon, targetLat, targetLon, maxDistance=400` | `boolean` |
| `formatDistance` | `distanceMeters` | `string` ("350m" o "2.1km") |

---

## 🎨 Sistema de Diseño (Theme)

- **Colores principales**: Azul medianoche (`#0D1B2A`) + Verde esmeralda (`#50C878`)
- **Tipografía**: Inter (body) + Montserrat (títulos)
- **Sombras**: Neomorfismo ligero (3 niveles: light, medium, heavy)
- **Espaciado**: Múltiplos de 4px (xs=4, s=8, m=16, l=24, xl=32)

---

## 🔒 Seguridad

- Acceso cerrado: solo usuarios registrados por admin
- Roles validados desde Firestore (colección "usuarios")
- Reglas de seguridad de Firestore deben configurarse para producción
- No se exponen datos sensibles innecesarios

---

## 🗺 Roadmap

### Fase 1 – MVP ✅ (Actual)
- [x] Auth cerrado con Firebase
- [x] CRUD pacientes completo
- [x] Historia clínica básica
- [x] Turnos con estados
- [x] Validación de 400m con GPS
- [ ] Notificaciones push (Firebase Cloud Messaging)

### Fase 2 – Escalamiento
- [ ] Optimización de consultas Firestore
- [ ] Analytics
- [ ] Exportación de HC en formato .ics
- [ ] Integración opcional con Google Calendar
- [ ] Mejoras visuales premium
