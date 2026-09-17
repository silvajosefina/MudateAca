import PanelLayout from '../layouts/PanelLayout'
import PublicacionForm from '../components/PublicacionForm'

function PublicacionNueva() {
    return (
        <PanelLayout>
            <PublicacionForm modo="crear" />
        </PanelLayout>
    )
}

export default PublicacionNueva
