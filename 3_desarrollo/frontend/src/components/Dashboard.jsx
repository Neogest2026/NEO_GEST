import React, { useEffect, useState } from 'react'

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'

const Dashboard = ({ onLogout, currentUser }) => {
    const [activeTab, setActiveTab] = useState('dashboard')
    const [empleados, setEmpleados] = useState([])
    const [empleadosError, setEmpleadosError] = useState('')
    const [empleadoSuccess, setEmpleadoSuccess] = useState('')
    const [isSavingEmpleado, setIsSavingEmpleado] = useState(false)
    const [empleadoForm, setEmpleadoForm] = useState({
        nombre_empleado: '',
        email: '',
        password: '',
        cargo: 'Logistica',
    })

    const menuItems = [
        { id: 'dashboard', label: 'Dashboard', icon: 'IN' },
        { id: 'inventario', label: 'Inventario', icon: 'ST' },
        { id: 'pedido', label: 'Pedidos', icon: 'PD' },
        { id: 'envios', label: 'Envios', icon: 'EN' },
        { id: 'facturacion', label: 'Facturacion', icon: 'FC' },
        { id: 'devolucion', label: 'Devolucion', icon: 'DV' },
        { id: 'usuarios', label: 'Usuarios', icon: 'US' },
        { id: 'config', label: 'Configuracion', icon: 'CF' },
    ]

    const stats = [
        { label: 'Ventas Totales', value: '$45,200', change: '+12% vs mes anterior', isPositive: true },
        { label: 'Pedidos Pendientes', value: '24', change: 'Requieren atencion', isPositive: false },
        { label: 'Productos en Stock', value: '1,250', change: '5 bajo stock minimo', isPositive: false },
        { label: 'Envios en Transito', value: '18', change: '', isPositive: true },
    ]

    const authHeaders = () => ({
        'Content-Type': 'application/json',
        Authorization: `Bearer ${currentUser?.token}`,
    })

    const loadEmpleados = async () => {
        if (!currentUser?.token) return
        setEmpleadosError('')
        try {
            const response = await fetch(`${API_URL}/api/v1/empleados`, { headers: authHeaders() })
            const data = await response.json()
            if (!response.ok) {
                setEmpleadosError(data.detail || 'No fue posible cargar empleados')
                return
            }
            setEmpleados(data)
        } catch (error) {
            console.error(error)
            setEmpleadosError('No fue posible conectar con empleados')
        }
    }

    useEffect(() => {
        if (activeTab === 'usuarios') {
            loadEmpleados()
        }
    }, [activeTab, currentUser])

    const updateEmpleadoForm = (field, value) => {
        setEmpleadoForm({ ...empleadoForm, [field]: value })
    }

    const crearEmpleado = async (event) => {
        event.preventDefault()
        setIsSavingEmpleado(true)
        setEmpleadosError('')
        setEmpleadoSuccess('')
        try {
            const response = await fetch(`${API_URL}/api/v1/empleados`, {
                method: 'POST',
                headers: authHeaders(),
                body: JSON.stringify(empleadoForm),
            })
            const data = await response.json()
            if (!response.ok) {
                setEmpleadosError(data.detail || 'No fue posible crear el empleado')
                return
            }
            setEmpleados([data, ...empleados])
            setEmpleadoForm({
                nombre_empleado: '',
                email: '',
                password: '',
                cargo: 'Logistica',
            })
            setEmpleadoSuccess('Empleado creado correctamente')
        } catch (error) {
            console.error(error)
            setEmpleadosError('No fue posible crear el empleado')
        } finally {
            setIsSavingEmpleado(false)
        }
    }

    const renderUsuarios = () => (
        <div className="admin-two-column">
            <section style={{ background: '#fff', borderRadius: '0.75rem', padding: '1.5rem', boxShadow: 'var(--shadow)' }}>
                <h2 style={{ fontSize: '1.2rem', marginBottom: '1rem', color: '#1a1a1a' }}>Registrar empleado</h2>
                <form onSubmit={crearEmpleado} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                    <input className="auth-input" value={empleadoForm.nombre_empleado} placeholder="Nombre del empleado" required minLength={3} onChange={(event) => updateEmpleadoForm('nombre_empleado', event.target.value)} />
                    <input className="auth-input" value={empleadoForm.email} type="email" placeholder="Correo" required onChange={(event) => updateEmpleadoForm('email', event.target.value)} />
                    <input className="auth-input" value={empleadoForm.password} type="password" placeholder="Contrasena temporal" required minLength={6} onChange={(event) => updateEmpleadoForm('password', event.target.value)} />
                    <select className="auth-input" value={empleadoForm.cargo} onChange={(event) => updateEmpleadoForm('cargo', event.target.value)}>
                        <option value="Logistica">Logistica</option>
                        <option value="Ventas">Ventas</option>
                        <option value="Inventario">Inventario</option>
                        <option value="Administracion">Administracion</option>
                    </select>
                    {empleadosError && <p className="inline-message error">{empleadosError}</p>}
                    {empleadoSuccess && <p className="inline-message success">{empleadoSuccess}</p>}
                    <button type="submit" className="btn btn-primary" disabled={isSavingEmpleado}>
                        {isSavingEmpleado ? 'Guardando...' : 'Crear empleado'}
                    </button>
                </form>
            </section>

            <section style={{ background: '#fff', borderRadius: '0.75rem', padding: '1.5rem', boxShadow: 'var(--shadow)', overflowX: 'auto' }}>
                <h2 style={{ fontSize: '1.2rem', marginBottom: '1rem', color: '#1a1a1a' }}>Empleados registrados</h2>
                <table className="premium-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Nombre</th>
                            <th>Cargo</th>
                            <th>Correo</th>
                            <th>Jefe Master</th>
                        </tr>
                    </thead>
                    <tbody>
                        {empleados.map((empleado) => (
                            <tr key={empleado.id}>
                                <td>#{empleado.id}</td>
                                <td>{empleado.nombre_empleado}</td>
                                <td>{empleado.cargo}</td>
                                <td>{empleado.usuario.email}</td>
                                <td>Usuario #{empleado.id_jefe_master}</td>
                            </tr>
                        ))}
                        {empleados.length === 0 && (
                            <tr>
                                <td colSpan="5" style={{ textAlign: 'center', color: '#718096' }}>No hay empleados registrados</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </section>
        </div>
    )

    const activeLabel = menuItems.find((item) => item.id === activeTab)?.label || 'Dashboard'

    return (
        <div className="dashboard-wrapper">
            <aside className="dashboard-sidebar">
                <div className="dashboard-logo">NEOGEST</div>
                <nav className="sidebar-nav">
                    {menuItems.map(item => (
                        <div key={item.id} className={`nav-item ${activeTab === item.id ? 'active' : ''}`} onClick={() => setActiveTab(item.id)}>
                            <span style={{ fontSize: '0.75rem', fontWeight: 800, width: 24 }}>{item.icon}</span>
                            {item.label}
                        </div>
                    ))}
                </nav>
                <div className="sidebar-footer" style={{ padding: '0 0.75rem' }}>
                    <div className="nav-item" onClick={onLogout} style={{ color: '#ff4d4d' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 800, width: 24 }}>SA</span> Salir
                    </div>
                </div>
            </aside>

            <main className="dashboard-main">
                <header className="dashboard-header">
                    <h1 className="resumen-title">{activeTab === 'dashboard' ? 'Resumen General' : activeLabel}</h1>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ textAlign: 'right' }}>
                            <p style={{ fontWeight: 600, fontSize: '0.9rem', color: '#1a1a1a' }}>Hola, <span style={{ fontWeight: 800 }}>Administrador</span></p>
                            {currentUser?.email && <p style={{ fontSize: '0.78rem', color: '#64748b' }}>{currentUser.email}</p>}
                        </div>
                        <div style={{ width: 40, height: 40, borderRadius: '50%', backgroundColor: '#e2e8f0' }}></div>
                    </div>
                </header>

                {activeTab === 'dashboard' && (
                    <>
                        <div className="stats-grid">
                            {stats.map((stat, index) => (
                                <div key={index} className="stat-card">
                                    <span className="stat-label">{stat.label}</span>
                                    <span className="stat-value">{stat.value}</span>
                                    <div className="stat-footer">
                                        {stat.isPositive ? <span style={{ color: '#10b981' }}>{stat.change}</span> : <span style={{ color: '#f59e0b' }}>{stat.change}</span>}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div style={{ background: '#fff', borderRadius: '0.75rem', padding: '2rem', boxShadow: 'var(--shadow)' }}>
                            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem', color: '#1a1a1a' }}>Ultimos Pedidos</h2>
                            <table className="premium-table">
                                <thead>
                                    <tr>
                                        <th>ID Pedido</th>
                                        <th>Cliente</th>
                                        <th>Fecha</th>
                                        <th>Total</th>
                                        <th>Estado</th>
                                        <th>Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td>#ORD-001</td>
                                        <td>Ana Garcia</td>
                                        <td>26 Nov 2023</td>
                                        <td>$1,200.00</td>
                                        <td><span className="badge badge-pending">Pendiente</span></td>
                                        <td><button className="btn-ver">Ver</button></td>
                                    </tr>
                                    <tr>
                                        <td>#ORD-002</td>
                                        <td>Carlos Lopez</td>
                                        <td>25 Nov 2023</td>
                                        <td>$850.00</td>
                                        <td><span className="badge badge-success">Enviado</span></td>
                                        <td><button className="btn-ver">Ver</button></td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </>
                )}

                {activeTab === 'usuarios' && renderUsuarios()}

                {['pedido', 'facturacion', 'devolucion', 'inventario', 'envios', 'config'].includes(activeTab) && (
                    <div style={{ background: '#fff', borderRadius: '0.75rem', padding: '3rem', textAlign: 'center', boxShadow: 'var(--shadow)' }}>
                        <h2 style={{ color: '#1a1a1a', marginBottom: '1rem' }}>Modulo de {activeLabel}</h2>
                        <p style={{ color: '#718096' }}>Este modulo esta siendo actualizado con el nuevo diseno de alta fidelidad.</p>
                    </div>
                )}
            </main>
        </div>
    )
}

export default Dashboard
