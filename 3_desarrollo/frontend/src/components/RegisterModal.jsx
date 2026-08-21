import { useState } from 'react'

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'

const RegisterModal = ({ onClose, onRegistered }) => {
    const [formData, setFormData] = useState({
        nombre_completo: '',
        telefono: '',
        direccion_envio: '',
        direccion_facturacion: '',
        codigo_postal: '',
        email: '',
        password: ''
    })
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [message, setMessage] = useState(null)

    const updateField = (field, value) => {
        setFormData({ ...formData, [field]: value })
    }

    const validarFormulario = () => {
        if (formData.nombre_completo.trim().length < 3) {
            setMessage({ type: 'error', text: 'El nombre debe tener minimo 3 caracteres' })
            return false
        }
        if (!/^[0-9]+$/.test(formData.telefono)) {
            setMessage({ type: 'error', text: 'El telefono solo debe contener numeros' })
            return false
        }
        if (!formData.email.includes('@')) {
            setMessage({ type: 'error', text: 'Correo electronico invalido' })
            return false
        }
        if (formData.password.length < 6) {
            setMessage({ type: 'error', text: 'La contrasena debe tener minimo 6 caracteres' })
            return false
        }
        return true
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!validarFormulario()) return

        setIsSubmitting(true)
        setMessage(null)
        try {
            const response = await fetch(`${API_URL}/registro-cliente`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            })
            const data = await response.json()

            if (!response.ok) {
                setMessage({ type: 'error', text: data.detail || 'Error en el registro' })
                return
            }

            onRegistered?.('Registro exitoso. Ya puedes iniciar sesion.')
            onClose()
        } catch (error) {
            console.error('Error:', error)
            setMessage({ type: 'error', text: 'Error en el registro' })
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(15, 23, 42, 0.4)',
            backdropFilter: 'blur(5px)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000
        }}>
            <div className="auth-card" style={{ padding: '2.5rem', maxWidth: '440px' }}>
                <h2 style={{
                    fontSize: '1.75rem',
                    fontWeight: 700,
                    marginBottom: '2rem',
                    textAlign: 'left',
                    color: '#111827'
                }}>
                    Registrarse en Neogest
                </h2>

                <form onSubmit={handleSubmit}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        <input className="auth-input" type="text" placeholder="Nombre completo" required onChange={e => updateField('nombre_completo', e.target.value)} />
                        <input className="auth-input" type="text" placeholder="Telefono" required onChange={e => updateField('telefono', e.target.value)} />
                        <input className="auth-input" type="text" placeholder="Direccion de envio" required onChange={e => updateField('direccion_envio', e.target.value)} />
                        <input className="auth-input" type="text" placeholder="Direccion de facturacion" required onChange={e => updateField('direccion_facturacion', e.target.value)} />
                        <input className="auth-input" type="text" placeholder="Codigo postal" required onChange={e => updateField('codigo_postal', e.target.value)} />
                        <input className="auth-input" type="email" placeholder="Correo electronico" required onChange={e => updateField('email', e.target.value)} />
                        <input className="auth-input" type="password" placeholder="Contrasena" required onChange={e => updateField('password', e.target.value)} />
                    </div>
                    {message && <p className={`inline-message ${message.type}`}>{message.text}</p>}

                    <div style={{ display: 'flex', gap: '1rem', marginTop: '2.5rem' }}>
                        <button type="submit" className="btn-auth-primary btn-auth-gold" style={{ margin: 0 }} disabled={isSubmitting}>
                            {isSubmitting ? 'Registrando...' : 'Registrarse'}
                        </button>
                        <button
                            type="button"
                            className="btn-auth-primary"
                            style={{ margin: 0, background: '#f3f4f6', color: '#111827', border: '1px solid #e5e7eb' }}
                            onClick={onClose}
                            disabled={isSubmitting}
                        >
                            Cancelar
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

export default RegisterModal
