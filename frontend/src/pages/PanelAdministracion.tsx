import { useState } from 'react'
import { AlertTriangle, Ban, Building2, Check, Download, Flag, FileSearch, FileText, RotateCcw, ShieldCheck, Users, X } from 'lucide-react'
import PanelLayout from '../layouts/PanelLayout'
import {
    aprobarVerificacionPublicacion,
    obtenerPublicacionesEnRevision,
    obtenerTodasLasPublicaciones,
    obtenerPublicacionPorId,
    ocultarPublicacion,
    rechazarVerificacionPublicacion,
    solicitarModificacionesPublicacion,
} from '../mocks/publicaciones'
import {
    actualizarEstadoVerificacionUsuario,
    obtenerInmobiliariasPendientes,
    obtenerTodosLosUsuarios,
    obtenerUsuarioPorId,
    reactivarUsuario,
    suspenderUsuario,
} from '../mocks/usuarios'
import { descartarReclamo, obtenerTodosLosReclamos, resolverReclamo } from '../mocks/reclamos'
import { mostrarToast } from '../mocks/toast'
import { formatearPrecio } from '../utils/formato'
import { ETIQUETAS_TIPO_INMUEBLE, type EstadoPublicacion, type Publicacion, type TipoDocumentoVerificacionPublicacion } from '../types/publicacion'
import type { EstadoReclamo, MotivoReclamo, Reclamo } from '../types/reclamo'
import type { EstadoCuenta, Usuario } from '../types/usuario'

const ETIQUETAS_MOTIVO_RECLAMO: Record<MotivoReclamo, string> = {
    enganosa: 'La publicación es engañosa',
    duplicada: 'Publicación duplicada',
    no_existe: 'La propiedad no existe',
    datos_falsos: 'Datos falsos',
    conducta_inapropiada: 'Conducta inapropiada',
    no_se_presento: 'No se presentó a una visita/encuentro acordado',
    posible_estafa: 'Posible estafa',
    otro: 'Otro motivo',
}

type FiltroReclamo = 'todos' | EstadoReclamo

const PESTANAS_RECLAMOS: { valor: FiltroReclamo; etiqueta: string }[] = [
    { valor: 'pendiente', etiqueta: 'Pendientes' },
    { valor: 'resuelto', etiqueta: 'Resueltos' },
    { valor: 'descartado', etiqueta: 'Descartados' },
    { valor: 'todos', etiqueta: 'Todos' },
]

const ETIQUETAS_ESTADO_RECLAMO: Record<EstadoReclamo, { texto: string; clase: string }> = {
    pendiente: { texto: 'Pendiente', clase: 'bg-warning-subtle text-warning' },
    resuelto: { texto: 'Resuelto', clase: 'bg-accent-subtle text-accent' },
    descartado: { texto: 'Descartado', clase: 'bg-surface-hover text-muted' },
}

const ETIQUETAS_DOCUMENTO: Record<TipoDocumentoVerificacionPublicacion, string> = {
    factura_servicio: 'Factura de un servicio asociada al domicilio',
    impuesto: 'Impuesto correspondiente al inmueble',
    documentacion_propiedad: 'Documentación de propiedad',
    matricula_corredor: 'Matrícula de corredor/a inmobiliario/a',
    constancia_inscripcion: 'Constancia de inscripción o CUIT de la inmobiliaria',
    poder_representacion: 'Poder o autorización de representación del propietario',
}

type FiltroAuditoria = 'todas' | EstadoPublicacion

const PESTANAS_AUDITORIA: { valor: FiltroAuditoria; etiqueta: string }[] = [
    { valor: 'todas', etiqueta: 'Todas' },
    { valor: 'pendiente_moderacion', etiqueta: 'En revisión' },
    { valor: 'activa', etiqueta: 'Activas' },
    { valor: 'pausada', etiqueta: 'Pausadas' },
    { valor: 'observada', etiqueta: 'Observadas' },
    { valor: 'rechazada', etiqueta: 'Rechazadas' },
    { valor: 'alquilada', etiqueta: 'Alquiladas' },
    { valor: 'archivada', etiqueta: 'Archivadas' },
    { valor: 'eliminada', etiqueta: 'Eliminadas' },
]

const ETIQUETAS_ESTADO_AUDITORIA: Record<EstadoPublicacion, { texto: string; clase: string }> = {
    pendiente_moderacion: { texto: 'En revisión', clase: 'bg-warning-subtle text-warning' },
    activa: { texto: 'Activa', clase: 'bg-accent-subtle text-accent' },
    pausada: { texto: 'Pausada', clase: 'bg-warning-subtle text-warning' },
    observada: { texto: 'Observada', clase: 'bg-warning-subtle text-warning' },
    reservada: { texto: 'Reservada', clase: 'bg-surface-hover text-foreground' },
    rechazada: { texto: 'Rechazada', clase: 'bg-danger-subtle text-danger' },
    alquilada: { texto: 'Alquilada', clase: 'bg-highlight text-on-accent' },
    archivada: { texto: 'Archivada', clase: 'bg-surface-hover text-muted' },
    eliminada: { texto: 'Eliminada', clase: 'bg-danger-subtle text-danger' },
}

type FiltroUsuarios = 'todos' | EstadoCuenta

const PESTANAS_USUARIOS: { valor: FiltroUsuarios; etiqueta: string }[] = [
    { valor: 'activo', etiqueta: 'Activos' },
    { valor: 'pendiente', etiqueta: 'Pendientes' },
    { valor: 'suspendido', etiqueta: 'Suspendidos' },
    { valor: 'todos', etiqueta: 'Todos' },
]

const ETIQUETAS_ESTADO_CUENTA: Record<EstadoCuenta, { texto: string; clase: string }> = {
    activo: { texto: 'Activo', clase: 'bg-accent-subtle text-accent' },
    pendiente: { texto: 'Pendiente', clase: 'bg-warning-subtle text-warning' },
    suspendido: { texto: 'Suspendido', clase: 'bg-danger-subtle text-danger' },
}

const ETIQUETAS_ROL: Record<Usuario['rol'], string> = {
    interesado: 'Interesado',
    propietario: 'Propietario',
    inmobiliaria: 'Inmobiliaria',
    administrador: 'Administrador',
}

type AccionConMotivo =
    | 'rechazar_inmobiliaria'
    | 'rechazar_publicacion'
    | 'suspender_usuario'
    | 'solicitar_modificaciones'
    | 'ocultar_publicacion'

type SolicitudConMotivo = { accion: AccionConMotivo; id: string; nombre: string }

const ETIQUETAS_ACCION_MOTIVO: Record<
    AccionConMotivo,
    { titulo: (nombre: string) => string; etiquetaMotivo: string; textoBoton: string; placeholder: string }
> = {
    rechazar_inmobiliaria: {
        titulo: (nombre) => `Rechazar ${nombre}`,
        etiquetaMotivo: 'Motivo del rechazo',
        textoBoton: 'Rechazar',
        placeholder: 'Explicá el motivo del rechazo para que la persona pueda corregirlo.',
    },
    rechazar_publicacion: {
        titulo: () => 'Rechazar publicación',
        etiquetaMotivo: 'Motivo del rechazo',
        textoBoton: 'Rechazar',
        placeholder: 'Explicá el motivo del rechazo para que la persona pueda corregirlo.',
    },
    suspender_usuario: {
        titulo: (nombre) => `Suspender a ${nombre}`,
        etiquetaMotivo: 'Motivo de la suspensión',
        textoBoton: 'Suspender',
        placeholder: 'Explicá por qué se suspende la cuenta.',
    },
    solicitar_modificaciones: {
        titulo: () => 'Solicitar modificaciones',
        etiquetaMotivo: '¿Qué debe corregir el propietario?',
        textoBoton: 'Enviar solicitud',
        placeholder: 'Detallá qué hay que modificar para que la publicación pueda aprobarse.',
    },
    ocultar_publicacion: {
        titulo: () => 'Ocultar publicación',
        etiquetaMotivo: 'Motivo para ocultarla',
        textoBoton: 'Ocultar',
        placeholder: 'Explicá por qué se oculta esta publicación.',
    },
}

function DialogoConMotivo({
    solicitud,
    onCancelar,
    onConfirmar,
}: {
    solicitud: SolicitudConMotivo
    onCancelar: () => void
    onConfirmar: (motivo: string) => void
}) {
    const [motivo, setMotivo] = useState('')
    const [error, setError] = useState('')
    const etiquetas = ETIQUETAS_ACCION_MOTIVO[solicitud.accion]

    function handleConfirmar() {
        if (!motivo.trim()) {
            setError(etiquetas.placeholder)
            return
        }
        onConfirmar(motivo.trim())
    }

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-overlay/70 backdrop-blur-sm p-4" onClick={onCancelar}>
            <div
                className="bg-surface rounded-2xl shadow-card w-full max-w-sm p-6 flex flex-col gap-4"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 shrink-0 text-danger" aria-hidden="true" />
                        <h3 className="text-base font-heading font-semibold text-foreground">
                            {etiquetas.titulo(solicitud.nombre)}
                        </h3>
                    </div>
                    <button
                        type="button"
                        onClick={onCancelar}
                        aria-label="Cerrar"
                        className="inline-flex items-center justify-center w-7 h-7 rounded-full text-foreground hover:bg-surface-hover transition-colors cursor-pointer shrink-0"
                    >
                        <X className="w-4 h-4" aria-hidden="true" />
                    </button>
                </div>
                <div>
                    <label className="block text-sm font-semibold text-foreground mb-1">{etiquetas.etiquetaMotivo}</label>
                    <textarea
                        value={motivo}
                        onChange={(e) => setMotivo(e.target.value)}
                        rows={3}
                        className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary ${error ? 'border-danger' : 'border-border'
                            }`}
                    />
                    {error && <p className="text-xs text-danger mt-1">{error}</p>}
                </div>
                <div className="flex flex-col sm:flex-row gap-3 mt-1">
                    <button
                        type="button"
                        onClick={handleConfirmar}
                        className="inline-flex items-center justify-center gap-1.5 font-heading font-semibold rounded-lg py-2 px-6 bg-danger text-white hover:opacity-90 transition-colors cursor-pointer"
                    >
                        {etiquetas.textoBoton}
                    </button>
                    <button
                        type="button"
                        onClick={onCancelar}
                        className="inline-flex items-center justify-center gap-1.5 text-sm font-semibold rounded-lg py-2 px-6 border border-border text-foreground hover:border-primary hover:text-primary transition-colors cursor-pointer"
                    >
                        Cancelar
                    </button>
                </div>
            </div>
        </div>
    )
}

function PanelAdministracion() {
    const [inmobiliarias, setInmobiliarias] = useState<Usuario[]>(() => obtenerInmobiliariasPendientes())
    const [publicaciones, setPublicaciones] = useState<Publicacion[]>(() => obtenerPublicacionesEnRevision())
    const [todasLasPublicaciones, setTodasLasPublicaciones] = useState<Publicacion[]>(() => obtenerTodasLasPublicaciones())
    const [filtroAuditoria, setFiltroAuditoria] = useState<FiltroAuditoria>('todas')
    const [reclamos, setReclamos] = useState<Reclamo[]>(() => obtenerTodosLosReclamos())
    const [filtroReclamo, setFiltroReclamo] = useState<FiltroReclamo>('pendiente')
    const [notasReclamo, setNotasReclamo] = useState<Record<string, string>>({})
    const [usuarios, setUsuarios] = useState<Usuario[]>(() => obtenerTodosLosUsuarios())
    const [filtroUsuarios, setFiltroUsuarios] = useState<FiltroUsuarios>('activo')
    const [solicitud, setSolicitud] = useState<SolicitudConMotivo | null>(null)

    function refrescar() {
        setInmobiliarias(obtenerInmobiliariasPendientes())
        setPublicaciones(obtenerPublicacionesEnRevision())
        setTodasLasPublicaciones(obtenerTodasLasPublicaciones())
        setReclamos(obtenerTodosLosReclamos())
        setUsuarios(obtenerTodosLosUsuarios())
    }

    const usuariosGestionables = usuarios.filter((u) => u.rol !== 'administrador')
    const usuariosFiltrados =
        filtroUsuarios === 'todos'
            ? usuariosGestionables
            : usuariosGestionables.filter((u) => u.estadoCuenta === filtroUsuarios)

    function handleReactivarUsuario(usuario: Usuario) {
        reactivarUsuario(usuario.id)
        mostrarToast(`${usuario.nombre} ${usuario.apellido} fue reactivado.`)
        refrescar()
    }

    const reclamosFiltrados =
        filtroReclamo === 'todos' ? reclamos : reclamos.filter((r) => r.estado === filtroReclamo)

    function handleResolverReclamo(id: string) {
        resolverReclamo(id, notasReclamo[id])
        mostrarToast('Reclamo marcado como resuelto.')
        refrescar()
    }

    function handleDescartarReclamo(id: string) {
        descartarReclamo(id, notasReclamo[id])
        mostrarToast('Reclamo descartado.')
        refrescar()
    }

    function nombreObjetivoReclamo(reclamo: Reclamo): string {
        if (reclamo.objetivoTipo === 'publicacion') {
            const publicacion = obtenerPublicacionPorId(reclamo.objetivoId)
            return publicacion ? publicacion.descripcion.slice(0, 50) : 'Publicación eliminada'
        }
        const usuario = obtenerUsuarioPorId(reclamo.objetivoId)
        return usuario ? `${usuario.nombre} ${usuario.apellido}` : 'Usuario eliminado'
    }

    const publicacionesAuditoria =
        filtroAuditoria === 'todas'
            ? todasLasPublicaciones
            : todasLasPublicaciones.filter((p) => p.estado === filtroAuditoria)

    function handleAprobarInmobiliaria(usuario: Usuario) {
        actualizarEstadoVerificacionUsuario(usuario.id, 'verificado')
        mostrarToast(`${usuario.nombre} ${usuario.apellido} fue verificada.`)
        refrescar()
    }

    function handleAprobarPublicacion(publicacion: Publicacion) {
        aprobarVerificacionPublicacion(publicacion.id)
        mostrarToast('Publicación verificada y activada.')
        refrescar()
    }

    function confirmarSolicitud(motivo: string) {
        if (!solicitud) return
        switch (solicitud.accion) {
            case 'rechazar_inmobiliaria':
                actualizarEstadoVerificacionUsuario(solicitud.id, 'rechazado', motivo)
                mostrarToast('Rechazo registrado.', 'error')
                break
            case 'rechazar_publicacion':
                rechazarVerificacionPublicacion(solicitud.id, motivo)
                mostrarToast('Rechazo registrado.', 'error')
                break
            case 'suspender_usuario':
                suspenderUsuario(solicitud.id, motivo)
                mostrarToast('Usuario suspendido.', 'error')
                break
            case 'solicitar_modificaciones':
                solicitarModificacionesPublicacion(solicitud.id, motivo)
                mostrarToast('Se solicitaron modificaciones al propietario.')
                break
            case 'ocultar_publicacion':
                ocultarPublicacion(solicitud.id, motivo)
                mostrarToast('Publicación ocultada.', 'error')
                break
        }
        setSolicitud(null)
        refrescar()
    }

    return (
        <PanelLayout>
            <h1 className="flex items-center gap-2 text-lg sm:text-xl font-heading font-semibold text-foreground mb-6">
                <ShieldCheck className="w-5 h-5 text-primary" aria-hidden="true" />
                Panel de administración
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
                                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-border p-3"
                            >
                                <div>
                                    <p className="text-sm font-semibold text-foreground">
                                        {usuario.nombre} {usuario.apellido}
                                    </p>
                                    <p className="text-xs text-muted">{usuario.correo}</p>
                                </div>
                                <div className="flex gap-2 shrink-0">
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

            <div className="bg-surface rounded-2xl shadow-card p-5 mb-6">
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
                                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-border p-3"
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
                                    <div className="flex gap-2 shrink-0">
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

            <div className="bg-surface rounded-2xl shadow-card p-5 mb-6">
                <h2 className="flex items-center gap-1.5 font-heading font-semibold text-foreground mb-4">
                    <Flag className="w-4 h-4 text-primary" aria-hidden="true" />
                    Reclamos
                </h2>
                <p className="text-sm text-muted mb-4">
                    Reportes enviados por usuarios sobre publicaciones o sobre otros usuarios.
                </p>

                <div className="flex flex-wrap gap-2 mb-4">
                    {PESTANAS_RECLAMOS.map((pestana) => {
                        const cantidad =
                            pestana.valor === 'todos'
                                ? reclamos.length
                                : reclamos.filter((r) => r.estado === pestana.valor).length
                        return (
                            <button
                                key={pestana.valor}
                                type="button"
                                onClick={() => setFiltroReclamo(pestana.valor)}
                                className={`text-sm font-semibold rounded-full px-3 py-1.5 transition-colors cursor-pointer ${filtroReclamo === pestana.valor
                                    ? 'bg-primary text-surface'
                                    : 'bg-surface text-foreground border border-border hover:bg-primary-subtle'
                                    }`}
                            >
                                {pestana.etiqueta} <span className="opacity-80">{cantidad}</span>
                            </button>
                        )
                    })}
                </div>

                {reclamosFiltrados.length === 0 ? (
                    <p className="text-sm text-muted">No hay reclamos en este estado.</p>
                ) : (
                    <div className="flex flex-col gap-3">
                        {reclamosFiltrados.map((reclamo) => {
                            const reclamante = obtenerUsuarioPorId(reclamo.reclamanteId)
                            const etiquetaEstado = ETIQUETAS_ESTADO_RECLAMO[reclamo.estado]
                            return (
                                <div key={reclamo.id} className="rounded-lg border border-border p-3 flex flex-col gap-2">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className={`text-xs font-semibold rounded-full px-2.5 py-1 ${etiquetaEstado.clase}`}>
                                            {etiquetaEstado.texto}
                                        </span>
                                        <span className="text-xs text-muted">
                                            {reclamo.objetivoTipo === 'publicacion' ? 'Publicación' : 'Usuario'}
                                        </span>
                                    </div>
                                    <p className="text-sm font-semibold text-foreground">
                                        {ETIQUETAS_MOTIVO_RECLAMO[reclamo.motivo]} · {nombreObjetivoReclamo(reclamo)}
                                    </p>
                                    <p className="text-sm text-muted">{reclamo.descripcion}</p>
                                    <p className="text-xs text-muted">
                                        Reportado por {reclamante ? `${reclamante.nombre} ${reclamante.apellido}` : 'Usuario'}
                                    </p>
                                    {reclamo.notaAdmin && (
                                        <p className="text-xs text-foreground bg-surface-hover rounded-lg px-3 py-2">
                                            Nota: {reclamo.notaAdmin}
                                        </p>
                                    )}
                                    {reclamo.estado === 'pendiente' && (
                                        <div className="flex flex-col sm:flex-row gap-2 mt-1">
                                            <input
                                                type="text"
                                                placeholder="Nota interna (opcional)"
                                                value={notasReclamo[reclamo.id] ?? ''}
                                                onChange={(e) =>
                                                    setNotasReclamo((prev) => ({ ...prev, [reclamo.id]: e.target.value }))
                                                }
                                                className="flex-1 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                            />
                                            <div className="flex gap-2 shrink-0">
                                                <button
                                                    type="button"
                                                    onClick={() => handleResolverReclamo(reclamo.id)}
                                                    className="inline-flex items-center justify-center gap-1.5 text-sm font-semibold rounded-lg px-3 py-2 bg-accent text-on-accent hover:opacity-90 transition-colors cursor-pointer whitespace-nowrap"
                                                >
                                                    <Check className="w-4 h-4" aria-hidden="true" />
                                                    Resolver
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleDescartarReclamo(reclamo.id)}
                                                    className="inline-flex items-center justify-center gap-1.5 text-sm font-semibold rounded-lg px-3 py-2 border border-border text-foreground hover:border-primary hover:text-primary transition-colors cursor-pointer whitespace-nowrap"
                                                >
                                                    <X className="w-4 h-4" aria-hidden="true" />
                                                    Descartar
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>

            <div className="bg-surface rounded-2xl shadow-card p-5">
                <h2 className="flex items-center gap-1.5 font-heading font-semibold text-foreground mb-1">
                    <FileText className="w-4 h-4 text-primary" aria-hidden="true" />
                    Publicaciones en revisión
                </h2>
                <p className="text-sm text-muted mb-4">
                    Pendientes de moderación inicial, o marcadas como observadas automáticamente.
                </p>
                {publicaciones.length === 0 ? (
                    <p className="text-sm text-muted">No hay publicaciones esperando verificación.</p>
                ) : (
                    <div className="flex flex-col gap-3">
                        {publicaciones.map((publicacion) => {
                            const propietario = obtenerUsuarioPorId(publicacion.propietarioId)
                            const etiquetaEstado = ETIQUETAS_ESTADO_AUDITORIA[publicacion.estado]
                            return (
                                <div
                                    key={publicacion.id}
                                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-border p-3"
                                >
                                    <div className="min-w-0">
                                        <div className="flex flex-wrap items-center gap-2 mb-1">
                                            <span className={`text-xs font-semibold rounded-full px-2.5 py-1 ${etiquetaEstado.clase}`}>
                                                {etiquetaEstado.texto}
                                            </span>
                                        </div>
                                        <p className="text-sm font-semibold text-foreground truncate">
                                            {publicacion.descripcion}
                                        </p>
                                        <p className="text-xs text-muted">
                                            {propietario ? `${propietario.nombre} ${propietario.apellido}` : 'Propietario'} ·{' '}
                                            {publicacion.ubicacion}
                                        </p>
                                        <p className="text-xs text-muted mt-1">
                                            {publicacion.tipoDocumentoVerificacion
                                                ? ETIQUETAS_DOCUMENTO[publicacion.tipoDocumentoVerificacion]
                                                : 'Sin tipo de documento'}
                                            {publicacion.nombreArchivoVerificacion && ` · ${publicacion.nombreArchivoVerificacion}`}
                                        </p>
                                        {publicacion.notaModeracion && (
                                            <p className="text-xs text-foreground bg-surface-hover rounded-lg px-2 py-1 mt-1">
                                                Nota: {publicacion.notaModeracion}
                                            </p>
                                        )}
                                    </div>
                                    <div className="flex gap-2 shrink-0 flex-wrap">
                                        {publicacion.urlArchivoVerificacion && (
                                            <a
                                                href={publicacion.urlArchivoVerificacion}
                                                download={publicacion.nombreArchivoVerificacion}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center justify-center gap-1.5 text-sm font-semibold rounded-lg px-3 py-2 border border-border text-foreground hover:border-primary hover:text-primary transition-colors cursor-pointer"
                                            >
                                                <Download className="w-4 h-4" aria-hidden="true" />
                                                Descargar
                                            </a>
                                        )}
                                        <button
                                            type="button"
                                            onClick={() => handleAprobarPublicacion(publicacion)}
                                            className="inline-flex items-center justify-center gap-1.5 text-sm font-semibold rounded-lg px-3 py-2 bg-accent text-on-accent hover:opacity-90 transition-colors cursor-pointer"
                                        >
                                            <Check className="w-4 h-4" aria-hidden="true" />
                                            Aprobar
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setSolicitud({
                                                    accion: 'solicitar_modificaciones',
                                                    id: publicacion.id,
                                                    nombre: 'publicación',
                                                })
                                            }
                                            className="inline-flex items-center justify-center gap-1.5 text-sm font-semibold rounded-lg px-3 py-2 border border-border text-foreground hover:border-primary hover:text-primary transition-colors cursor-pointer"
                                        >
                                            <FileSearch className="w-4 h-4" aria-hidden="true" />
                                            Solicitar modificaciones
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setSolicitud({
                                                    accion: 'ocultar_publicacion',
                                                    id: publicacion.id,
                                                    nombre: 'publicación',
                                                })
                                            }
                                            className="inline-flex items-center justify-center gap-1.5 text-sm font-semibold rounded-lg px-3 py-2 border border-border text-foreground hover:border-primary hover:text-primary transition-colors cursor-pointer"
                                        >
                                            <Ban className="w-4 h-4" aria-hidden="true" />
                                            Ocultar
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setSolicitud({
                                                    accion: 'rechazar_publicacion',
                                                    id: publicacion.id,
                                                    nombre: 'publicación',
                                                })
                                            }
                                            className="inline-flex items-center justify-center gap-1.5 text-sm font-semibold rounded-lg px-3 py-2 border border-danger text-danger hover:bg-danger hover:text-white transition-colors cursor-pointer"
                                        >
                                            <X className="w-4 h-4" aria-hidden="true" />
                                            Rechazar
                                        </button>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>

            <div className="bg-surface rounded-2xl shadow-card p-5 mt-6">
                <h2 className="flex items-center gap-1.5 font-heading font-semibold text-foreground mb-4">
                    <FileSearch className="w-4 h-4 text-primary" aria-hidden="true" />
                    Auditoría de publicaciones
                </h2>
                <p className="text-sm text-muted mb-4">
                    Todas las publicaciones enviadas por propietarios e inmobiliarias, en cualquier estado.
                </p>

                <div className="flex flex-wrap gap-2 mb-4">
                    {PESTANAS_AUDITORIA.map((pestana) => {
                        const cantidad =
                            pestana.valor === 'todas'
                                ? todasLasPublicaciones.length
                                : todasLasPublicaciones.filter((p) => p.estado === pestana.valor).length
                        return (
                            <button
                                key={pestana.valor}
                                type="button"
                                onClick={() => setFiltroAuditoria(pestana.valor)}
                                className={`text-sm font-semibold rounded-full px-3 py-1.5 transition-colors cursor-pointer ${filtroAuditoria === pestana.valor
                                    ? 'bg-primary text-surface'
                                    : 'bg-surface text-foreground border border-border hover:bg-primary-subtle'
                                    }`}
                            >
                                {pestana.etiqueta} <span className="opacity-80">{cantidad}</span>
                            </button>
                        )
                    })}
                </div>

                {publicacionesAuditoria.length === 0 ? (
                    <p className="text-sm text-muted">No hay publicaciones en este estado.</p>
                ) : (
                    <div className="flex flex-col gap-3">
                        {publicacionesAuditoria.map((publicacion) => {
                            const propietario = obtenerUsuarioPorId(publicacion.propietarioId)
                            const etiquetaEstado = ETIQUETAS_ESTADO_AUDITORIA[publicacion.estado]
                            return (
                                <div
                                    key={publicacion.id}
                                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-border p-3"
                                >
                                    <div className="min-w-0">
                                        <div className="flex flex-wrap items-center gap-2 mb-1">
                                            <span className={`text-xs font-semibold rounded-full px-2.5 py-1 ${etiquetaEstado.clase}`}>
                                                {etiquetaEstado.texto}
                                            </span>
                                            <span className="text-xs text-muted">{ETIQUETAS_TIPO_INMUEBLE[publicacion.tipoInmueble]}</span>
                                        </div>
                                        <p className="text-sm font-semibold text-foreground truncate">
                                            {publicacion.descripcion}
                                        </p>
                                        <p className="text-xs text-muted">
                                            {propietario ? `${propietario.nombre} ${propietario.apellido}` : 'Propietario'} ·{' '}
                                            {publicacion.ubicacion} · {formatearPrecio(publicacion.precio)}
                                        </p>
                                        {publicacion.estado === 'rechazada' && publicacion.motivoRechazoVerificacion && (
                                            <p className="text-xs text-danger mt-1">
                                                Motivo del rechazo: {publicacion.motivoRechazoVerificacion}
                                            </p>
                                        )}
                                    </div>
                                    {publicacion.urlArchivoVerificacion && (
                                        <a
                                            href={publicacion.urlArchivoVerificacion}
                                            download={publicacion.nombreArchivoVerificacion}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center justify-center gap-1.5 text-sm font-semibold rounded-lg px-3 py-2 border border-border text-foreground hover:border-primary hover:text-primary transition-colors cursor-pointer shrink-0"
                                        >
                                            <Download className="w-4 h-4" aria-hidden="true" />
                                            Descargar
                                        </a>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>

            {solicitud && (
                <DialogoConMotivo solicitud={solicitud} onCancelar={() => setSolicitud(null)} onConfirmar={confirmarSolicitud} />
            )}
        </PanelLayout>
    )
}

export default PanelAdministracion
