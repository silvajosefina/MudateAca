import { useState } from 'react'
import { Ban, Building2, Check, RotateCcw, Users, X } from 'lucide-react'
import PanelLayout from '../layouts/PanelLayout'
import DialogoConMotivo from '../components/DialogoConMotivo'
import ModalDetalleUsuario from '../components/ModalDetalleUsuario'
import type { SolicitudConMotivo } from '../types/accionAdmin'
import {
    actualizarEstadoVerificacionUsuario,
    obtenerInmobiliariasPendientes,
    obtenerTodosLosUsuarios,
    reactivarUsuario,
    suspenderUsuario,
} from '../mocks/usuarios'
import { mostrarToast } from '../mocks/toast'
import { ETIQUETAS_ESTADO_CUENTA, ETIQUETAS_ROL, type EstadoCuenta, type Usuario } from '../types/usuario'

type FiltroUsuarios = 'todos' | EstadoCuenta

const PESTANAS_USUARIOS: { valor: FiltroUsuarios; etiqueta: string }[] = [
    { valor: 'activo', etiqueta: 'Activos' },
    { valor: 'pendiente', etiqueta: 'Pendientes' },
    { valor: 'suspendido', etiqueta: 'Suspendidos' },
    { valor: 'todos', etiqueta: 'Todos' },
]

function AdminUsuarios() {
    const [inmobiliarias, setInmobiliarias] = useState<Usuario[]>(() => obtenerInmobiliariasPendientes())
    const [usuarios, setUsuarios] = useState<Usuario[]>(() => obtenerTodosLosUsuarios())
    const [filtroUsuarios, setFiltroUsuarios] = useState<FiltroUsuarios>('activo')
    const [solicitud, setSolicitud] = useState<SolicitudConMotivo | null>(null)
    const [usuarioAVer, setUsuarioAVer] = useState<Usuario | null>(null)

    function refrescar() {
        setInmobiliarias(obtenerInmobiliariasPendientes())
        setUsuarios(obtenerTodosLosUsuarios())
    }

    const usuariosGestionables = usuarios.filter((u) => u.rol !== 'administrador')
    const usuariosFiltrados =
        filtroUsuarios === 'todos'
            ? usuariosGestionables
            : usuariosGestionables.filter((u) => u.estadoCuenta === filtroUsuarios)

    function handleAprobarInmobiliaria(usuario: Usuario) {
        actualizarEstadoVerificacionUsuario(usuario.id, 'verificado')
        mostrarToast(`${usuario.nombre} ${usuario.apellido} fue verificada.`)
        refrescar()
    }

    function handleReactivarUsuario(usuario: Usuario) {
        reactivarUsuario(usuario.id)
        mostrarToast(`${usuario.nombre} ${usuario.apellido} fue reactivado.`)
        refrescar()
    }

    function confirmarSolicitud(motivo: string) {
        if (!solicitud) return
        if (solicitud.accion === 'rechazar_inmobiliaria') {
            actualizarEstadoVerificacionUsuario(solicitud.id, 'rechazado', motivo)
            mostrarToast('Rechazo registrado.', 'error')
        } else if (solicitud.accion === 'suspender_usuario') {
            suspenderUsuario(solicitud.id, motivo)
            mostrarToast('Usuario suspendido.', 'error')
        }
        setSolicitud(null)
        refrescar()
    }

    return (
        <PanelLayout>
            <h1 className="flex items-center gap-2 text-lg sm:text-xl font-heading font-semibold text-foreground mb-6">
                <Users className="w-5 h-5 text-primary" aria-hidden="true" />
                Usuarios
            </h1>

            <div className="bg-surface rounded-2xl shadow-card p-5 mb-6">
                <h2 className="flex items-center gap-1.5 font-heading font-semibold text-foreground mb-4">
                    <Building2 className="w-4 h-4 text-primary" aria-hidden="true" />
                    Inmobiliarias pendientes de verificación
                </h2>
                {inmobiliarias.length === 0 ? (
                    <p className="text-sm text-muted">No hay inmobiliarias esperando verificación.</p>
                ) : (
                    <div className="flex flex-col gap-3">
                        {inmobiliarias.map((usuario) => (
                            <div
                                key={usuario.id}
                                onClick={() => setUsuarioAVer(usuario)}
                                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-border p-3 cursor-pointer hover:border-primary hover:bg-surface-hover transition-colors"
                            >
                                <div>
                                    <p className="text-sm font-semibold text-foreground">
                                        {usuario.nombre} {usuario.apellido}
                                    </p>
                                    <p className="text-xs text-muted">{usuario.correo}</p>
                                </div>
                                <div className="flex gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                                    <button
                                        type="button"
                                        onClick={() => handleAprobarInmobiliaria(usuario)}
                                        className="inline-flex items-center justify-center gap-1.5 text-sm font-semibold rounded-lg px-3 py-2 bg-accent text-on-accent hover:opacity-90 transition-colors cursor-pointer"
                                    >
                                        <Check className="w-4 h-4" aria-hidden="true" />
                                        Aprobar
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setSolicitud({
                                                accion: 'rechazar_inmobiliaria',
                                                id: usuario.id,
                                                nombre: `${usuario.nombre} ${usuario.apellido}`,
                                            })
                                        }
                                        className="inline-flex items-center justify-center gap-1.5 text-sm font-semibold rounded-lg px-3 py-2 border border-danger text-danger hover:bg-danger hover:text-white transition-colors cursor-pointer"
                                    >
                                        <X className="w-4 h-4" aria-hidden="true" />
                                        Rechazar
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="bg-surface rounded-2xl shadow-card p-5">
                <h2 className="flex items-center gap-1.5 font-heading font-semibold text-foreground mb-4">
                    <Users className="w-4 h-4 text-primary" aria-hidden="true" />
                    Gestión de usuarios
                </h2>

                <div className="flex flex-wrap gap-2 mb-4">
                    {PESTANAS_USUARIOS.map((pestana) => {
                        const cantidad =
                            pestana.valor === 'todos'
                                ? usuariosGestionables.length
                                : usuariosGestionables.filter((u) => u.estadoCuenta === pestana.valor).length
                        return (
                            <button
                                key={pestana.valor}
                                type="button"
                                onClick={() => setFiltroUsuarios(pestana.valor)}
                                className={`text-sm font-semibold rounded-full px-3 py-1.5 transition-colors cursor-pointer ${filtroUsuarios === pestana.valor
                                    ? 'bg-primary text-surface'
                                    : 'bg-surface text-foreground border border-border hover:bg-primary-subtle'
                                    }`}
                            >
                                {pestana.etiqueta} <span className="opacity-80">{cantidad}</span>
                            </button>
                        )
                    })}
                </div>

                {usuariosFiltrados.length === 0 ? (
                    <p className="text-sm text-muted">No hay usuarios en este estado.</p>
                ) : (
                    <div className="flex flex-col gap-3">
                        {usuariosFiltrados.map((usuario) => {
                            const etiquetaEstado = ETIQUETAS_ESTADO_CUENTA[usuario.estadoCuenta]
                            return (
                                <div
                                    key={usuario.id}
                                    onClick={() => setUsuarioAVer(usuario)}
                                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-border p-3 cursor-pointer hover:border-primary hover:bg-surface-hover transition-colors"
                                >
                                    <div className="min-w-0">
                                        <div className="flex flex-wrap items-center gap-2 mb-1">
                                            <span className={`text-xs font-semibold rounded-full px-2.5 py-1 ${etiquetaEstado.clase}`}>
                                                {etiquetaEstado.texto}
                                            </span>
                                            <span className="text-xs text-muted">{ETIQUETAS_ROL[usuario.rol]}</span>
                                        </div>
                                        <p className="text-sm font-semibold text-foreground">
                                            {usuario.nombre} {usuario.apellido}
                                        </p>
                                        <p className="text-xs text-muted">{usuario.correo}</p>
                                        {usuario.estadoCuenta === 'suspendido' && usuario.motivoSuspension && (
                                            <p className="text-xs text-danger mt-1">
                                                Motivo: {usuario.motivoSuspension}
                                            </p>
                                        )}
                                    </div>
                                    <div className="flex gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                                        {usuario.estadoCuenta === 'suspendido' ? (
                                            <button
                                                type="button"
                                                onClick={() => handleReactivarUsuario(usuario)}
                                                className="inline-flex items-center justify-center gap-1.5 text-sm font-semibold rounded-lg px-3 py-2 bg-accent text-on-accent hover:opacity-90 transition-colors cursor-pointer"
                                            >
                                                <RotateCcw className="w-4 h-4" aria-hidden="true" />
                                                Reactivar
                                            </button>
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setSolicitud({
                                                        accion: 'suspender_usuario',
                                                        id: usuario.id,
                                                        nombre: `${usuario.nombre} ${usuario.apellido}`,
                                                    })
                                                }
                                                className="inline-flex items-center justify-center gap-1.5 text-sm font-semibold rounded-lg px-3 py-2 border border-danger text-danger hover:bg-danger hover:text-white transition-colors cursor-pointer"
                                            >
                                                <Ban className="w-4 h-4" aria-hidden="true" />
                                                Suspender
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>

            {solicitud && (
                <DialogoConMotivo solicitud={solicitud} onCancelar={() => setSolicitud(null)} onConfirmar={confirmarSolicitud} />
            )}

            {usuarioAVer && <ModalDetalleUsuario usuario={usuarioAVer} onClose={() => setUsuarioAVer(null)} />}
        </PanelLayout>
    )
}

export default AdminUsuarios
