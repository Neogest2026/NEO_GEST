// Importación de React y el Hook useState
// useState permite manejar estados dentro del componente
import React, { useState } from 'react'
/*
========================================================
COMPONENTE LOGIN
========================================================
Este componente representa el formulario de autenticación
del sistema NeoGest.
Permite que un usuario o administrador ingrese al sistema
mediante correo electrónico y contraseña.
PROPS QUE RECIBE:
onLoginSuccess → función que se ejecuta cuando el login es exitoso
onBack → función para regresar a la página principal
isAdminLogin → indica si el login es para administrador
*/
const Login = ({ onLoginSuccess, onBack, isAdminLogin }) => {
    /*
    ========================================================
    ESTADOS DEL FORMULARIO
    ========================================================
    email → almacena el correo electrónico ingresado
    password → almacena la contraseña ingresada
    */
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    /*
    ========================================================
    FUNCIÓN DE ENVÍO DEL FORMULARIO
    ========================================================
    handleSubmit controla el evento de envío del formulario
    evitando que la página se recargue.
    Aquí se implementa una lógica básica simulada (mock)
    para determinar si el usuario es administrador o cliente.
    */
    const handleSubmit = async (e) => {
    e.preventDefault()

    try {
        const response = await fetch("http://127.0.0.1:8000/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                email: email,
                password: password
            })
        })

        const data = await response.json()

        console.log("Respuesta backend:", data)

        if (response.ok) {
            if (data.rol === 1) {
                onLoginSuccess({ role: "admin", userId: data.idUsuario })
            } else {
                onLoginSuccess({ role: "cliente", userId: data.idUsuario })
            }
        } else {
            alert(data.detail || "Error en login")
        }

    } catch (error) {
        console.error("Error conectando con API:", error)
        alert("No se pudo conectar con el servidor")
    }
}
    /*
    ========================================================
    RENDER DEL COMPONENTE
    ========================================================
    */
    return (
        <div className="auth-container">
            <div className="auth-card">
                {/* LOGO DEL SISTEMA */}
                <div className="auth-logo">
                    NEO<span>GEST</span>
                </div>
                {/* TÍTULO DINÁMICO */}
                <h1 className="auth-title">
                    {isAdminLogin
                        ? 'Acceso Administrativo'
                        : 'Bienvenido'
                    }
                </h1>
                {/* SUBTÍTULO */}
                <p className="auth-subtitle">
                    {isAdminLogin
                        ? 'Ingresa tus credenciales para gestionar Neogest'
                        : 'Ingresa a tu cuenta para continuar'
                    }
                </p>
                {/* FORMULARIO DE LOGIN */}
                <form onSubmit={handleSubmit}>
                    {/* CAMPO EMAIL */}
                    <div className="auth-form-group">
                        <label className="auth-label">
                            Correo Electrónico
                        </label>
                        <input
                            className="auth-input"
                            type="email"
                            placeholder="ejemplo@neogest.com"
                            required
                            onChange={e => setEmail(e.target.value)}
                        />
                    </div>
                    {/* CAMPO CONTRASEÑA */}
                    <div className="auth-form-group">
                        <label className="auth-label">
                            Contraseña
                        </label>
                        <input
                            className="auth-input"
                            type="password"
                            placeholder="........"
                            required
                            onChange={e => setPassword(e.target.value)}
                        />
                    </div>
                    {/* BOTÓN DE INGRESO */}
                    <button
                        type="submit"
                        className="btn-auth-primary"
                    >
                        Ingresar
                    </button>
                </form>
                {/* CREDENCIALES DE PRUEBA */}
                <div className="auth-test-credentials">
                    <p style={{ fontWeight: 600, marginBottom: '0.25rem' }}>
                        Credenciales de prueba:
                    </p>
                    <p>Admin: admin@neogest.com / admin123</p>
                    <p>Cliente: usa un usuario registrado en la base de datos</p>
                </div>
                {/* LINK REGISTRO */}
                <p className="auth-footer-text">
                    ¿No tienes cuenta?
                    <span className="auth-link-gold">
                        Regístrate
                    </span>
                </p>
                {/* BOTÓN PARA VOLVER A LA TIENDA */}
                <span
                    className="auth-link-secondary"
                    onClick={onBack}
                >
                    Volver a la tienda
                </span>
            </div>
        </div>
    )
}
// Exportación del componente para ser utilizado en otros módulos
export default Login
