import { Routes, Route, Navigate } from 'react-router'
import Registro from './pages/Registro'
import Login from './pages/Login'
import RecuperarContrasena from './pages/RecuperarContrasena'
import MisPublicaciones from './pages/MisPublicaciones'
import PublicacionNueva from './pages/PublicacionNueva'
import PublicacionEditar from './pages/PublicacionEditar'
import Explorar from './pages/Explorar'
import PublicacionDetalle from './pages/PublicacionDetalle'
import MisBusquedas from './pages/MisBusquedas'
import MisFavoritos from './pages/MisFavoritos'
import Mensajes from './pages/Mensajes'
import PanelDemanda from './pages/PanelDemanda'
import MiCuenta from './pages/MiCuenta'
import MisReclamos from './pages/MisReclamos'
import HistorialNotificaciones from './pages/HistorialNotificaciones'
import PanelAdministracion from './pages/PanelAdministracion'
import AdminUsuarios from './pages/AdminUsuarios'
import AdminPublicaciones from './pages/AdminPublicaciones'
import AdminReclamos from './pages/AdminReclamos'
import RutaPrivada from './components/RutaPrivada'
import ToastViewport from './components/ToastViewport'
import ScrollAlTope from './components/ScrollAlTope'
import BotonAyuda from './components/BotonAyuda'

const ROLES_ANUNCIANTE = ['propietario', 'inmobiliaria'] as const

function App() {
  return (
    <>
      <ScrollAlTope />
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/registro" element={<Registro />} />
        <Route path="/recuperar-contrasena" element={<RecuperarContrasena />} />
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
      <ToastViewport />
      <BotonAyuda />
    </>
  )
}

export default App
