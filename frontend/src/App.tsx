import { Routes, Route, Navigate } from 'react-router'
import Registro from './pages/Registro'
import Login from './pages/Login'
import RecuperarContrasena from './pages/RecuperarContrasena'
import VerificacionPropietario from './pages/VerificacionPropietario'
import MisPublicaciones from './pages/MisPublicaciones'
import PublicacionNueva from './pages/PublicacionNueva'
import PublicacionEditar from './pages/PublicacionEditar'
import RutaPrivada from './components/RutaPrivada'

const ROLES_ANUNCIANTE = ['propietario', 'inmobiliaria'] as const

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<Login />} />
      <Route path="/registro" element={<Registro />} />
      <Route path="/recuperar-contrasena" element={<RecuperarContrasena />} />

      <Route
        path="/verificacion"
        element={
          <RutaPrivada rolesPermitidos={[...ROLES_ANUNCIANTE]}>
            <VerificacionPropietario />
          </RutaPrivada>
        }
      />
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
    </Routes>
  )
}

export default App
