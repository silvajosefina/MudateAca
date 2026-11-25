import { useState } from 'react'
import { Ban, RotateCcw, Search, Users } from 'lucide-react'
import PanelLayout from '../layouts/PanelLayout'
import DialogoConMotivo from '../components/DialogoConMotivo'
import ModalDetalleUsuario from '../components/ModalDetalleUsuario'
import Paginacion from '../components/Paginacion'
import type { SolicitudConMotivo } from '../types/accionAdmin'
import { listarUsuarios, reactivarUsuario, suspenderUsuario, type UsuarioAdministrado } from '../servicios/administracion'
import { mensajeDeError } from '../servicios/errores'
import { useConsulta } from '../hooks/useConsulta'
import { useDebouncedValue } from '../hooks/useDebouncedValue'
import { mostrarToast } from '../utils/toast'
import { nombreDelAnunciante } from '../utils/formato'
import { ETIQUETAS_ESTADO_CUENTA, ETIQUETAS_ROL, type EstadoCuenta } from '../types/usuario'

type FiltroUsuarios = 'todos' | EstadoCuenta

const PESTANAS_USUARIOS: { valor: FiltroUsuarios; etiqueta: string }[] = [
    { valor: 'activo', etiqueta: 'Activos' },
    { valor: 'suspendido', etiqueta: 'Suspendidos' },
    { valor: 'todos', etiqueta: 'Todos' },
]

const USUARIOS_POR_PAGINA = 10

function AdminUsuarios() {
    const [filtroUsuarios, setFiltroUsuarios] = useState<FiltroUsuarios>('activo')
    const [busqueda, setBusqueda] = useState('')
    const [paginaActual, setPaginaActual] = useState(1)
    const [solicitud, setSolicitud] = useState<SolicitudConMotivo | null>(null)
    const [usuarioAVer, setUsuarioAVer] = useState<UsuarioAdministrado | null>(null)
    const busquedaDebounced = useDebouncedValue(busqueda.trim(), 300)

    const estado = filtroUsuarios === 'todos' ? null : filtroUsuarios
    const consulta = useConsulta(`${estado}-${busquedaDebounced}-${paginaActual}`, () =>
        listarUsuarios(estado, paginaActual, busquedaDebounced),
    )
    const usuarios = consulta.datos?.results ?? []
    const totales = consulta.datos?.totales ?? {}
    const refrescar = consulta.recargar

    function cantidadDe(valor: FiltroUsuarios) {
        if (valor === 'todos') return (totales.activo ?? 0) + (totales.suspendido ?? 0)
        return totales[valor] ?? 0
    }

    async function handleReactivarUsuario(usuario: UsuarioAdministrado) {
        try {
            await reactivarUsuario(usuario.id)
            mostrarToast(`${nombreDelAnunciante(usuario)} fue reactivado. Le avisamos por correo.`)
            refrescar()
        } catch (error) {
            mostrarToast(mensajeDeError(error), 'error')
        }
    }

    async function confirmarSolicitud(motivo: string) {
        if (!solicitud || solicitud.accion !== 'suspender_usuario') return
        const id = solicitud.id
        setSolicitud(null)
        try {
            await suspenderUsuario(id, motivo)
            mostrarToast('Usuario suspendido. Le avisamos el motivo por correo.', 'error')
            refrescar()
        } catch (error) {
            mostrarToast(mensajeDeError(error), 'error')
        }
    }

    const totalPaginas = Math.max(1, Math.ceil((consulta.datos?.count ?? 0) / USUARIOS_POR_PAGINA))

    return (
        <PanelLayout>
            <h1 className="flex items-center gap-2 text-lg sm:text-xl font-heading font-semibold text-foreground mb-6">
                <Users className="w-5 h-5 text-primary" aria-hidden="true" />
                Usuarios
            </h1>

            <div className="bg-surface rounded-2xl shadow-card p-5">
                <h2 className="flex items-center gap-1.5 font-heading font-semibold text-foreground mb-4">
                    <Users className="w-4 h-4 text-primary" aria-hidden="true" />
                    Gestión de usuarios
                </h2>

                <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
                    <div className="flex flex-wrap gap-2">
                        {PESTANAS_USUARIOS.map((pestana) => (
                            <button
                                key={pestana.valor}
                                type="button"
                                onClick={() => {
                                    setFiltroUsuarios(pestana.valor)
                                    setPaginaActual(1)
                                }}
                                className={`text-sm font-semibold rounded-full px-3 py-1.5 transition-colors cursor-pointer ${filtroUsuarios === pestana.valor
                                    ? 'bg-primary text-surface'
                                    : 'bg-surface text-foreground border border-border hover:bg-primary-subtle'
                                    }`}
                            >
                                {pestana.etiqueta} <span className="opacity-80">{cantidadDe(pestana.valor)}</span>
                            </button>
                        ))}
                    </div>
                    <div className="relative sm:ml-auto sm:w-64">
                        <Search className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
                        <input
                            type="search"
                            placeholder="Buscar por nombre o correo"
                            value={busqueda}
                            onChange={(e) => {
                                setBusqueda(e.target.value)
                                setPaginaActual(1)
                            }}
                            className="w-full border border-border rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                    </div>
                </div>

                {consulta.cargando && usuarios.length === 0 ? (
                    <p className="text-sm text-muted">Cargando usuarios…</p>
                ) : consulta.error ? (
                    <p className="text-sm text-danger">{mensajeDeError(consulta.error, 'No se pudieron cargar los usuarios.')}</p>
                ) : usuarios.length === 0 ? (
                    <p className="text-sm text-muted">No hay usuarios en este estado.</p>
                ) : (
                    <div className="flex flex-col gap-3">
                        {usuarios.map((usuario) => {
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
                                            {usuario.razonSocial && <span className="text-muted font-normal"> · {usuario.razonSocial}</span>}
                                        </p>
                                        <p className="text-xs text-muted">{usuario.correo}</p>
                                        {usuario.estadoCuenta === 'suspendido' && usuario.motivoSuspension && (
                                            <p className="text-xs text-danger mt-1">Motivo: {usuario.motivoSuspension}</p>
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

                <Paginacion paginaActual={paginaActual} totalPaginas={totalPaginas} onCambiarPagina={setPaginaActual} />
            </div>

            {solicitud && (
                <DialogoConMotivo solicitud={solicitud} onCancelar={() => setSolicitud(null)} onConfirmar={confirmarSolicitud} />
            )}

            {usuarioAVer && <ModalDetalleUsuario usuario={usuarioAVer} onClose={() => setUsuarioAVer(null)} />}
        </PanelLayout>
    )
}

export default AdminUsuarios
