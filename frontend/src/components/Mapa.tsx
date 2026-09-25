import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png'
import iconUrl from 'leaflet/dist/images/marker-icon.png'
import shadowUrl from 'leaflet/dist/images/marker-shadow.png'
import 'leaflet/dist/leaflet.css'

delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl
L.Icon.Default.mergeOptions({ iconRetinaUrl, iconUrl, shadowUrl })

interface MapaProps {
    lat: number
    lng: number
    onCambiarPosicion?: (lat: number, lng: number) => void
    alturaClase?: string
}

function ClicksDelMapa({ onCambiarPosicion }: { onCambiarPosicion: (lat: number, lng: number) => void }) {
    useMapEvents({
        click(e) {
            onCambiarPosicion(e.latlng.lat, e.latlng.lng)
        },
    })
    return null
}

function Mapa({ lat, lng, onCambiarPosicion, alturaClase = 'h-64' }: MapaProps) {
    const interactivo = Boolean(onCambiarPosicion)

    return (
        <div className={`${alturaClase} w-full rounded-lg overflow-hidden border border-border`}>
            <MapContainer
                center={[lat, lng]}
                zoom={15}
                scrollWheelZoom={interactivo}
                className="w-full h-full"
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <Marker
                    position={[lat, lng]}
                    draggable={interactivo}
                    eventHandlers={
                        onCambiarPosicion
                            ? {
                                dragend: (e) => {
                                    const posicion = e.target.getLatLng()
                                    onCambiarPosicion(posicion.lat, posicion.lng)
                                },
                            }
                            : undefined
                    }
                />
                {onCambiarPosicion && <ClicksDelMapa onCambiarPosicion={onCambiarPosicion} />}
            </MapContainer>
        </div>
    )
}

export default Mapa
