import { jsPDF } from 'jspdf'

export interface SerieReporte {
    etiqueta: string
    valor: number
}

export interface ReporteDemandaDatos {
    fecha: string
    periodo: string
    busquedasActivas: number
    tipoMasBuscado: string
    rangoMasSolicitado: string
    datosTipos: SerieReporte[]
    datosPrecios: SerieReporte[]
    datosZonas: SerieReporte[]
    tendencia: SerieReporte[]
    caracteristicas: SerieReporte[]
    coincidencias: SerieReporte[]
}

type ColorRGB = [number, number, number]

// Paleta "verde bosque" — debe coincidir siempre con los tokens de index.css.
const COLOR_PRIMARY: ColorRGB = [31, 77, 59]
const COLOR_PRIMARY_SUBTLE: ColorRGB = [220, 232, 224]
const COLOR_ACCENT: ColorRGB = [184, 146, 63]
const COLOR_ACCENT_SUBTLE: ColorRGB = [242, 230, 200]
const COLOR_WARNING: ColorRGB = [192, 107, 69]
const COLOR_WARNING_SUBTLE: ColorRGB = [243, 218, 199]
const COLOR_HIGHLIGHT: ColorRGB = [201, 146, 44]
const COLOR_FOREGROUND: ColorRGB = [28, 43, 34]
const COLOR_MUTED: ColorRGB = [110, 97, 82]
const COLOR_BORDER: ColorRGB = [225, 215, 194]
const COLOR_SURFACE_HOVER: ColorRGB = [239, 231, 214]
const COLOR_WHITE: ColorRGB = [255, 255, 255]

const ANCHO_PAGINA = 210
const ALTO_PAGINA = 297
const MARGEN = 16
const ANCHO_CONTENIDO = ANCHO_PAGINA - MARGEN * 2
const PIE_PAGINA_Y = ALTO_PAGINA - 12

function dibujarEncabezado(doc: jsPDF, fecha: string, periodo: string): number {
    doc.setFillColor(...COLOR_PRIMARY)
    doc.rect(0, 0, ANCHO_PAGINA, 26, 'F')

    doc.setTextColor(...COLOR_WHITE)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(18)
    doc.text('Mudate Acá', MARGEN, 15)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.text(`Panel de demanda · Reporte de búsquedas activas · ${periodo}`, MARGEN, 21)

    doc.setFontSize(9)
    doc.text(fecha, ANCHO_PAGINA - MARGEN, 15, { align: 'right' })

    return 36
}

function dibujarPiePagina(doc: jsPDF) {
    const totalPaginas = doc.internal.pages.length - 1
    for (let pagina = 1; pagina <= totalPaginas; pagina++) {
        doc.setPage(pagina)
        doc.setDrawColor(...COLOR_BORDER)
        doc.line(MARGEN, PIE_PAGINA_Y - 4, ANCHO_PAGINA - MARGEN, PIE_PAGINA_Y - 4)
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(8)
        doc.setTextColor(...COLOR_MUTED)
        doc.text('Mudate Acá — Información agregada y anónima, sin datos personales.', MARGEN, PIE_PAGINA_Y)
        doc.text(`Página ${pagina} de ${totalPaginas}`, ANCHO_PAGINA - MARGEN, PIE_PAGINA_Y, { align: 'right' })
    }
}

function dibujarTituloSeccion(doc: jsPDF, texto: string, y: number): number {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.setTextColor(...COLOR_FOREGROUND)
    doc.text(texto, MARGEN, y)
    return y + 7
}

function dibujarTiles(
    doc: jsPDF,
    tiles: { valor: string; etiqueta: string; color: ColorRGB; colorSubtle: ColorRGB }[],
    y: number,
): number {
    const gap = 5
    const anchoTile = (ANCHO_CONTENIDO - gap * (tiles.length - 1)) / tiles.length
    const altoTile = 22

    tiles.forEach((tile, indice) => {
        const x = MARGEN + indice * (anchoTile + gap)
        doc.setFillColor(...tile.colorSubtle)
        doc.roundedRect(x, y, anchoTile, altoTile, 3, 3, 'F')

        doc.setFillColor(...tile.color)
        doc.circle(x + 7, y + 7, 2.6, 'F')

        doc.setFont('helvetica', 'bold')
        doc.setFontSize(12)
        doc.setTextColor(...COLOR_FOREGROUND)
        const valorTexto = doc.splitTextToSize(tile.valor, anchoTile - 6)
        doc.text(valorTexto, x + 4, y + 13)

        doc.setFont('helvetica', 'normal')
        doc.setFontSize(7.5)
        doc.setTextColor(...COLOR_MUTED)
        const etiquetaTexto = doc.splitTextToSize(tile.etiqueta, anchoTile - 6)
        doc.text(etiquetaTexto, x + 4, y + 18.5)
    })

    return y + altoTile + 10
}

function dibujarBarras(doc: jsPDF, datos: SerieReporte[], color: ColorRGB, y: number): number {
    if (datos.length === 0) {
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(9)
        doc.setTextColor(...COLOR_MUTED)
        doc.text('Todavía no hay datos suficientes.', MARGEN, y + 4)
        return y + 12
    }

    const anchoEtiqueta = 48
    const anchoValor = 10
    const anchoBarra = ANCHO_CONTENIDO - anchoEtiqueta - anchoValor
    const maximo = Math.max(1, ...datos.map((d) => d.valor))
    const altoFila = 7.5

    let cursorY = y
    datos.forEach((dato) => {
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(8.5)
        doc.setTextColor(...COLOR_FOREGROUND)
        const etiqueta = doc.splitTextToSize(dato.etiqueta, anchoEtiqueta - 2)[0] as string
        doc.text(etiqueta, MARGEN, cursorY + 4)

        const xBarra = MARGEN + anchoEtiqueta
        doc.setFillColor(...COLOR_SURFACE_HOVER)
        doc.roundedRect(xBarra, cursorY, anchoBarra, 4, 2, 2, 'F')

        const anchoProporcional = Math.max(3, (dato.valor / maximo) * anchoBarra)
        doc.setFillColor(...color)
        doc.roundedRect(xBarra, cursorY, anchoProporcional, 4, 2, 2, 'F')

        doc.setFont('helvetica', 'bold')
        doc.setFontSize(8.5)
        doc.setTextColor(...COLOR_FOREGROUND)
        doc.text(String(dato.valor), ANCHO_PAGINA - MARGEN, cursorY + 4, { align: 'right' })

        cursorY += altoFila
    })

    return cursorY + 4
}

function dibujarTendencia(doc: jsPDF, datos: SerieReporte[], y: number): number {
    const altoGrafico = 34
    const anchoGrafico = ANCHO_CONTENIDO

    if (datos.length === 0) {
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(9)
        doc.setTextColor(...COLOR_MUTED)
        doc.text('Todavía no hay datos suficientes.', MARGEN, y + 4)
        return y + 12
    }

    const maximo = Math.max(1, ...datos.map((d) => d.valor))
    const paso = datos.length > 1 ? anchoGrafico / (datos.length - 1) : 0
    const puntos = datos.map((dato, indice) => ({
        x: MARGEN + indice * paso,
        y: y + altoGrafico - (dato.valor / maximo) * altoGrafico,
        dato,
    }))

    doc.setDrawColor(...COLOR_BORDER)
    doc.line(MARGEN, y + altoGrafico, MARGEN + anchoGrafico, y + altoGrafico)

    doc.setDrawColor(...COLOR_PRIMARY)
    doc.setLineWidth(0.6)
    for (let i = 0; i < puntos.length - 1; i++) {
        doc.line(puntos[i].x, puntos[i].y, puntos[i + 1].x, puntos[i + 1].y)
    }
    doc.setLineWidth(0.2)

    puntos.forEach((punto, indice) => {
        doc.setFillColor(...COLOR_PRIMARY)
        doc.circle(punto.x, punto.y, 1.6, 'F')

        doc.setFont('helvetica', 'bold')
        doc.setFontSize(8)
        doc.setTextColor(...COLOR_FOREGROUND)
        const align = indice === 0 ? 'left' : indice === puntos.length - 1 ? 'right' : 'center'
        doc.text(String(punto.dato.valor), punto.x, punto.y - 3, { align })

        doc.setFont('helvetica', 'normal')
        doc.setFontSize(7.5)
        doc.setTextColor(...COLOR_MUTED)
        doc.text(punto.dato.etiqueta, punto.x, y + altoGrafico + 6, { align })
    })

    return y + altoGrafico + 12
}

export function generarReporteDemandaPDF(datos: ReporteDemandaDatos): void {
    const doc = new jsPDF({ unit: 'mm', format: 'a4' })
    let y = dibujarEncabezado(doc, datos.fecha, datos.periodo)

    y = dibujarTiles(
        doc,
        [
            { valor: String(datos.busquedasActivas), etiqueta: 'Búsquedas activas en la plataforma', color: COLOR_PRIMARY, colorSubtle: COLOR_PRIMARY_SUBTLE },
            { valor: datos.tipoMasBuscado, etiqueta: 'Tipo de inmueble más buscado', color: COLOR_ACCENT, colorSubtle: COLOR_ACCENT_SUBTLE },
            { valor: datos.rangoMasSolicitado, etiqueta: 'Rango de precios más solicitado', color: COLOR_WARNING, colorSubtle: COLOR_WARNING_SUBTLE },
        ],
        y,
    )

    y = dibujarTituloSeccion(doc, 'Demanda por tipo de inmueble', y)
    y = dibujarBarras(doc, datos.datosTipos, COLOR_PRIMARY, y) + 4

    y = dibujarTituloSeccion(doc, 'Demanda por rango de precio', y)
    y = dibujarBarras(doc, datos.datosPrecios, COLOR_ACCENT, y) + 4

    y = dibujarTituloSeccion(doc, 'Demanda por barrio/localidad', y)
    y = dibujarBarras(doc, datos.datosZonas, COLOR_PRIMARY, y) + 4

    if (y > 200) {
        doc.addPage()
        y = 20
    }

    y = dibujarTituloSeccion(doc, 'Búsquedas nuevas por semana', y)
    y = dibujarTendencia(doc, datos.tendencia, y) + 4

    if (y > 200) {
        doc.addPage()
        y = 20
    }

    y = dibujarTituloSeccion(doc, 'Características más demandadas', y)
    y = dibujarBarras(doc, datos.caracteristicas, COLOR_HIGHLIGHT, y) + 4

    y = dibujarTituloSeccion(doc, 'Coincidencias con tus publicaciones activas', y)
    dibujarBarras(doc, datos.coincidencias, COLOR_ACCENT, y)

    dibujarPiePagina(doc)

    doc.save(`panel-demanda-${new Date().toISOString().slice(0, 10)}.pdf`)
}
