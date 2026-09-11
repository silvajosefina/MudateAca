import { Routes, Route, Navigate } from 'react-router'
import Registro from './pages/Registro'
import Login from './pages/Login'
import RecuperarContrasena from './pages/RecuperarContrasena'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<Login />} />
      <Route path="/registro" element={<Registro />} />
      <Route path="/recuperar-contrasena" element={<RecuperarContrasena />} />
    </Routes>
  )
}

export default App