import { useState } from 'react'

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'

const Login = ({ onLoginSuccess, onBack, isAdminLogin }) => {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')
        setIsSubmitting(true)

        try {
            const response = await fetch(`${API_URL}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            })

            const data = await response.json()

            if (!response.ok) {
                setError(data.detail || 'Error en login')
                return
            }

            onLoginSuccess({
                role: data.rol === 3 ? 'cliente' : 'admin',
                roleId: data.rol,
                userId: data.idUsuario,
                token: data.access_token,
                tokenType: data.token_type,
                email: data.email || email,
                name: data.nombre || data.email || email,
            })
        } catch (requestError) {
            console.error('Error conectando con API:', requestError)
            setError('No se pudo conectar con el servidor')
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div className="auth-container">
            <div className="auth-card">
                <div className="auth-logo">
                    NEO<span>GEST</span>
                </div>
                <h1 className="auth-title">
                    {isAdminLogin ? 'Acceso Administrativo' : 'Bienvenido'}
                </h1>
                <p className="auth-subtitle">
                    {isAdminLogin ? 'Ingresa tus credenciales para gestionar Neogest' : 'Ingresa a tu cuenta para continuar'}
                </p>
                <form onSubmit={handleSubmit}>
                    <div className="auth-form-group">
                        <label className="auth-label">Correo Electronico</label>
                        <input
                            className="auth-input"
                            type="email"
                            placeholder="ejemplo@neogest.com"
                            required
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                        />
                    </div>
                    <div className="auth-form-group">
                        <label className="auth-label">Contrasena</label>
                        <input
                            className="auth-input"
                            type="password"
                            placeholder="........"
                            required
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                        />
                    </div>
                    {error && <p className="inline-message error">{error}</p>}
                    <button type="submit" className="btn-auth-primary" disabled={isSubmitting}>
                        {isSubmitting ? 'Ingresando...' : 'Ingresar'}
                    </button>
                </form>
                <div className="auth-test-credentials">
                    <p style={{ fontWeight: 600, marginBottom: '0.25rem' }}>Credenciales de prueba:</p>
                    <p>Admin: admin@neogest.com / admin123</p>
                    <p>Cliente: test1@gmail.com / 123456</p>
                </div>
                <p className="auth-footer-text">
                    No tienes cuenta? <span className="auth-link-gold">Registrate</span>
                </p>
                <span className="auth-link-secondary" onClick={onBack}>
                    Volver a la tienda
                </span>
            </div>
        </div>
    )
}

export default Login
