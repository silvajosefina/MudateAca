import { lazy, Suspense, useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router'
import Login from './pages/Login'
import Explorar from './pages/Explorar'
import RutaPrivada from './components/RutaPrivada'
import ToastViewport from './components/ToastViewport'
import ScrollAlTope from './components/ScrollAlTope'
import BotonAyuda from './components/BotonAyuda'
import { useSesion, useSesionValidada, validarSesion } from './servicios/sesion'
import { rutaDeInicio } from './utils/rutas'

// Cada pantalla se descarga recién cuando se abre; Login y Explorar, las de entrada, van en el paquete inicial.
const Registro = lazy(() => import('./pages/Registro'))
const RecuperarContrasena = lazy(() => import('./pages/RecuperarContrasena'))
const RestablecerContrasena = lazy(() => import('./pages/RestablecerContrasena'))
const MisPublicaciones = lazy(() => import('./pages/MisPublicaciones'))
const PublicacionNueva = lazy(() => import('./pages/PublicacionNueva'))
const PublicacionEditar = lazy(() => import('./pages/PublicacionEditar'))
const PublicacionDetalle = lazy(() => import('./pages/PublicacionDetalle'))
const MisBusquedas = lazy(() => import('./pages/MisBusquedas'))
const MisFavoritos = lazy(() => import('./pages/MisFavoritos'))
const Mensajes = lazy(() => import('./pages/Mensajes'))
const PanelDemanda = lazy(() => import('./pages/PanelDemanda'))
const MiCuenta = lazy(() => import('./pages/MiCuenta'))
const MisReclamos = lazy(() => import('./pages/MisReclamos'))
const HistorialNotificaciones = lazy(() => import('./pages/HistorialNotificaciones'))
const PanelAdministracion = lazy(() => import('./pages/PanelAdministracion'))
const AdminUsuarios = lazy(() => import('./pages/AdminUsuarios'))
const AdminPublicaciones = lazy(() => import('./pages/AdminPublicaciones'))
const AdminReclamos = lazy(() => import('./pages/AdminReclamos'))

const ROLES_ANUNCIANTE = ['propietario', 'inmobiliaria'] as const

function App() {
  // Redibuja la aplicación cuando la sesión se inicia, se cierra o vence.
  // Con la sesión abierta, la raíz, el login y el registro llevan a la pantalla de inicio del rol.
  // Hasta confirmar la sesión con el backend no se redirige por rol: el perfil guardado
  // puede ser de una sesión vencida y llevaría a una pantalla privada que termina en el login.
  const sesion = useSesion()
  const sesionValidada = useSesionValidada()

  useEffect(() => {
    validarSesion()
  }, [])

  const cargando = <p className="text-sm text-muted text-center py-16">Cargando…</p>
  const inicio = <Navigate to={rutaDeInicio(sesion?.rol)} replace />

  return (
    <>
      <ScrollAlTope />
      <Suspense fallback={cargando}>
      <Routes>
        <Route path="/" element={sesionValidada ? inicio : cargando} />
        <Route path="/login" element={!sesionValidada ? cargando : sesion ? inicio : <Login />} />
        <Route path="/registro" element={!sesionValidada ? cargando : sesion ? inicio : <Registro />} />
        <Route path="/recuperar-contrasena" element={<RecuperarContrasena />} />
        <Route path="/restablecer-contrasena" element={<RestablecerContrasena />} />
        <Route path="/explorar" element={<Explorar />} />
        <Route path="/explorar/:id" element={<PublicacionDetalle />} />

        <Route
          path="/mis-publicaciones"
          element={
            <RutaPrivada rolesPermitidos={[...ROLES_ANUNCIANTE]}>
              <MisPublicaciones />
            </RutaPrivada>
          }
        />
        <Route
          path="/publicaciones/nueva"
          element={
            <RutaPrivada rolesPermitidos={[...ROLES_ANUNCIANTE]}>
              <PublicacionNueva />
            </RutaPrivada>
          }
        />
        <Route
          path="/publicaciones/:id/editar"
          element={
            <RutaPrivada rolesPermitidos={[...ROLES_ANUNCIANTE]}>
              <PublicacionEditar />
            </RutaPrivada>
          }
        />
        <Route
          path="/mis-busquedas"
          element={
            <RutaPrivada rolesPermitidos={['interesado']}>
              <MisBusquedas />
            </RutaPrivada>
          }
        />
        <Route
          path="/favoritos"
          element={
            <RutaPrivada rolesPermitidos={['interesado']}>
              <MisFavoritos />
            </RutaPrivada>
          }
        />
        <Route
          path="/mensajes"
          element={
            <RutaPrivada>
              <Mensajes />
            </RutaPrivada>
          }
        />
        <Route
          path="/panel-demanda"
          element={
            <RutaPrivada rolesPermitidos={[...ROLES_ANUNCIANTE]}>
              <PanelDemanda />
            </RutaPrivada>
          }
        />
        <Route
          path="/mi-cuenta"
          element={
            <RutaPrivada>
              <MiCuenta />
            </RutaPrivada>
          }
        />
        <Route
          path="/mis-reclamos"
          element={
            <RutaPrivada>
              <MisReclamos />
            </RutaPrivada>
          }
        />
        <Route
          path="/notificaciones"
          element={
            <RutaPrivada>
              <HistorialNotificaciones />
            </RutaPrivada>
          }
        />
        <Route
          path="/panel-administracion"
          element={
            <RutaPrivada rolesPermitidos={['administrador']}>
              <PanelAdministracion />
            </RutaPrivada>
          }
        />
        <Route
          path="/panel-administracion/usuarios"
          element={
            <RutaPrivada rolesPermitidos={['administrador']}>
              <AdminUsuarios />
            </RutaPrivada>
          }
        />
        <Route
          path="/panel-administracion/publicaciones"
          element={
            <RutaPrivada rolesPermitidos={['administrador']}>
              <AdminPublicaciones />
            </RutaPrivada>
          }
        />
        <Route
          path="/panel-administracion/reclamos"
          element={
            <RutaPrivada rolesPermitidos={['administrador']}>
              <AdminReclamos />
            </RutaPrivada>
          }
        />
      </Routes>
      </Suspense>
      <ToastViewport />
      <BotonAyuda />
    </>
  )
}

export default App
