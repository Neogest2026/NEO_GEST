import { useCallback, useEffect, useState } from 'react'

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'

const formatPrice = (price) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(price || 0)

const formatDate = (value) => {
    if (!value) return 'Sin fecha'
    return new Intl.DateTimeFormat('es-CO', {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
    }).format(new Date(value))
}

const getShippingBadgeClass = (status) => {
    const classes = {
        'En ruta': 'badge-process',
        Entregado: 'badge-success',
        Pendiente: 'badge-pending',
        Cancelado: 'badge-cancelled',
    }
    return classes[status] || 'badge-neutral'
}

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
    const [pedidosEnvio, setPedidosEnvio] = useState([])
    const [envios, setEnvios] = useState([])
    const [enviosError, setEnviosError] = useState('')
    const [envioSuccess, setEnvioSuccess] = useState('')
    const [isLoadingEnvios, setIsLoadingEnvios] = useState(false)
    const [isSavingEnvio, setIsSavingEnvio] = useState(false)
    const [envioForm, setEnvioForm] = useState({
        pedido_id: '',
        empresa_transporte: 'Servientrega',
        codigo_seguimiento: '',
        fecha_entrega_estimada: '',
    })
    const [editingEnvioId, setEditingEnvioId] = useState(null)
    const [trackingForm, setTrackingForm] = useState({
        empresa_transporte: '',
        codigo_seguimiento: '',
        estado: 'En ruta',
        fecha_entrega_estimada: '',
    })
    const [productosInventario, setProductosInventario] = useState([])
    const [movimientosInventario, setMovimientosInventario] = useState([])
    const [inventarioError, setInventarioError] = useState('')
    const [inventarioSuccess, setInventarioSuccess] = useState('')
    const [isSavingMovimiento, setIsSavingMovimiento] = useState(false)
    const [movimientoForm, setMovimientoForm] = useState({
        producto_id: '',
        tipo: 'Entrada',
        cantidad: 1,
        observacion: '',
    })
    const [pedidosDevolucion, setPedidosDevolucion] = useState([])
    const [devoluciones, setDevoluciones] = useState([])
    const [devolucionesError, setDevolucionesError] = useState('')
    const [devolucionesSuccess, setDevolucionesSuccess] = useState('')
    const [isSavingDevolucion, setIsSavingDevolucion] = useState(false)
    const [devolucionForm, setDevolucionForm] = useState({
        pedido_id: '',
        motivo: '',
    })
    const [refundAmounts, setRefundAmounts] = useState({})

    const currentRoleId = currentUser?.roleId || (currentUser?.role === 'admin' ? 1 : 3)
    const canManageUsers = currentRoleId === 1
    const menuItems = [
        { id: 'dashboard', label: 'Dashboard', icon: 'IN' },
        { id: 'inventario', label: 'Inventario', icon: 'ST' },
        { id: 'pedido', label: 'Pedidos', icon: 'PD' },
        { id: 'envios', label: 'Envios', icon: 'EN' },
        { id: 'facturacion', label: 'Facturacion', icon: 'FC' },
        { id: 'devolucion', label: 'Devolucion', icon: 'DV' },
        ...(canManageUsers ? [{ id: 'usuarios', label: 'Usuarios', icon: 'US' }] : []),
        { id: 'config', label: 'Configuracion', icon: 'CF' },
    ]

    const stats = [
        { label: 'Ventas Totales', value: '$45,200', change: '+12% vs mes anterior', isPositive: true },
        { label: 'Pedidos Pendientes', value: '24', change: 'Requieren atencion', isPositive: false },
        { label: 'Productos en Stock', value: '1,250', change: '5 bajo stock minimo', isPositive: false },
        { label: 'Envios en Transito', value: '18', change: '', isPositive: true },
    ]

    const authHeaders = useCallback(() => ({
        'Content-Type': 'application/json',
        Authorization: `Bearer ${currentUser?.token}`,
    }), [currentUser?.token])

    const loadEmpleados = useCallback(async () => {
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
    }, [authHeaders, currentUser?.token])

    useEffect(() => {
        if (activeTab === 'usuarios') {
            loadEmpleados()
        }
    }, [activeTab, loadEmpleados])

    const loadEnvios = useCallback(async () => {
        if (!currentUser?.token) return
        setIsLoadingEnvios(true)
        setEnviosError('')
        try {
            const [pedidosResponse, enviosResponse] = await Promise.all([
                fetch(`${API_URL}/api/v1/envios/pedidos`, { headers: authHeaders() }),
                fetch(`${API_URL}/api/v1/envios`, { headers: authHeaders() }),
            ])
            const pedidosData = await pedidosResponse.json()
            const enviosData = await enviosResponse.json()

            if (!pedidosResponse.ok) {
                setEnviosError(pedidosData.detail || 'No fue posible cargar pedidos para envio')
                return
            }
            if (!enviosResponse.ok) {
                setEnviosError(enviosData.detail || 'No fue posible cargar envios')
                return
            }

            setPedidosEnvio(pedidosData)
            setEnvios(enviosData)
            setEnvioForm((current) => ({
                ...current,
                pedido_id: current.pedido_id || pedidosData.find((pedido) => !pedido.ya_tiene_envio)?.id || '',
            }))
        } catch (error) {
            console.error(error)
            setEnviosError('No fue posible conectar con el modulo de envios')
        } finally {
            setIsLoadingEnvios(false)
        }
    }, [authHeaders, currentUser?.token])

    useEffect(() => {
        if (activeTab === 'envios') {
            loadEnvios()
        }
    }, [activeTab, loadEnvios])

    const loadInventario = useCallback(async () => {
        if (!currentUser?.token) return
        setInventarioError('')
        try {
            const [productosResponse, movimientosResponse] = await Promise.all([
                fetch(`${API_URL}/api/v1/productos`, { headers: authHeaders() }),
                fetch(`${API_URL}/api/v1/inventario/movimientos`, { headers: authHeaders() }),
            ])
            const productosData = await productosResponse.json()
            const movimientosData = await movimientosResponse.json()

            if (!productosResponse.ok) {
                setInventarioError(productosData.detail || 'No fue posible cargar productos')
                return
            }
            if (!movimientosResponse.ok) {
                setInventarioError(movimientosData.detail || 'No fue posible cargar movimientos')
                return
            }

            setProductosInventario(productosData)
            setMovimientosInventario(movimientosData)
            setMovimientoForm((current) => ({
                ...current,
                producto_id: current.producto_id || productosData[0]?.id || '',
            }))
        } catch (error) {
            console.error(error)
            setInventarioError('No fue posible conectar con inventario')
        }
    }, [authHeaders, currentUser?.token])

    useEffect(() => {
        if (activeTab === 'inventario') {
            loadInventario()
        }
    }, [activeTab, loadInventario])

    const loadDevoluciones = useCallback(async () => {
        if (!currentUser?.token) return
        setDevolucionesError('')
        try {
            const [pedidosResponse, devolucionesResponse] = await Promise.all([
                fetch(`${API_URL}/api/v1/devoluciones/pedidos`, { headers: authHeaders() }),
                fetch(`${API_URL}/api/v1/devoluciones?estado=Solicitada`, { headers: authHeaders() }),
            ])
            const pedidosData = await pedidosResponse.json()
            const devolucionesData = await devolucionesResponse.json()

            if (!pedidosResponse.ok) {
                setDevolucionesError(pedidosData.detail || 'No fue posible cargar pedidos')
                return
            }
            if (!devolucionesResponse.ok) {
                setDevolucionesError(devolucionesData.detail || 'No fue posible cargar devoluciones')
                return
            }

            setPedidosDevolucion(pedidosData)
            setDevoluciones(devolucionesData)
            setDevolucionForm((current) => ({
                ...current,
                pedido_id: current.pedido_id || pedidosData[0]?.id || '',
            }))
        } catch (error) {
            console.error(error)
            setDevolucionesError('No fue posible conectar con devoluciones')
        }
    }, [authHeaders, currentUser?.token])

    useEffect(() => {
        if (activeTab === 'devolucion') {
            loadDevoluciones()
        }
    }, [activeTab, loadDevoluciones])

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

    const updateEnvioForm = (field, value) => {
        setEnvioForm({ ...envioForm, [field]: value })
    }

    const updateTrackingForm = (field, value) => {
        setTrackingForm({ ...trackingForm, [field]: value })
    }

    const updateMovimientoForm = (field, value) => {
        setMovimientoForm({ ...movimientoForm, [field]: value })
    }

    const updateDevolucionForm = (field, value) => {
        setDevolucionForm({ ...devolucionForm, [field]: value })
    }

    const crearEnvio = async (event) => {
        event.preventDefault()
        setIsSavingEnvio(true)
        setEnviosError('')
        setEnvioSuccess('')
        try {
            const payload = {
                pedido_id: Number(envioForm.pedido_id),
                empresa_transporte: envioForm.empresa_transporte.trim(),
                codigo_seguimiento: envioForm.codigo_seguimiento.trim(),
                ...(envioForm.fecha_entrega_estimada ? { fecha_entrega_estimada: new Date(`${envioForm.fecha_entrega_estimada}T12:00:00`).toISOString() } : {}),
            }
            const response = await fetch(`${API_URL}/api/v1/envios`, {
                method: 'POST',
                headers: authHeaders(),
                body: JSON.stringify(payload),
            })
            const data = await response.json()
            if (!response.ok) {
                setEnviosError(data.detail || 'No fue posible registrar el envio')
                return
            }

            setEnvioForm({
                pedido_id: '',
                empresa_transporte: 'Servientrega',
                codigo_seguimiento: '',
                fecha_entrega_estimada: '',
            })
            setEnvioSuccess(`Envio registrado para el pedido #${data.pedido_id}`)
            await loadEnvios()
        } catch (error) {
            console.error(error)
            setEnviosError('No fue posible registrar el envio')
        } finally {
            setIsSavingEnvio(false)
        }
    }

    const startEditEnvio = (envio) => {
        setEditingEnvioId(envio.id)
        setTrackingForm({
            empresa_transporte: envio.empresa_transporte || '',
            codigo_seguimiento: envio.codigo_seguimiento || '',
            estado: envio.estado || 'En ruta',
            fecha_entrega_estimada: envio.fecha_entrega_estimada ? envio.fecha_entrega_estimada.slice(0, 10) : '',
        })
    }

    const actualizarEnvio = async (event) => {
        event.preventDefault()
        if (!editingEnvioId) return
        setIsSavingEnvio(true)
        setEnviosError('')
        setEnvioSuccess('')
        try {
            const payload = {
                empresa_transporte: trackingForm.empresa_transporte.trim(),
                codigo_seguimiento: trackingForm.codigo_seguimiento.trim(),
                estado: trackingForm.estado,
                fecha_entrega_estimada: trackingForm.fecha_entrega_estimada ? new Date(`${trackingForm.fecha_entrega_estimada}T12:00:00`).toISOString() : null,
            }
            const response = await fetch(`${API_URL}/api/v1/envios/${editingEnvioId}`, {
                method: 'PATCH',
                headers: authHeaders(),
                body: JSON.stringify(payload),
            })
            const data = await response.json()
            if (!response.ok) {
                setEnviosError(data.detail || 'No fue posible actualizar el envio')
                return
            }

            setEditingEnvioId(null)
            setEnvioSuccess(`Tracking actualizado para el pedido #${data.pedido_id}`)
            await loadEnvios()
        } catch (error) {
            console.error(error)
            setEnviosError('No fue posible actualizar el envio')
        } finally {
            setIsSavingEnvio(false)
        }
    }

    const registrarMovimiento = async (event) => {
        event.preventDefault()
        setIsSavingMovimiento(true)
        setInventarioError('')
        setInventarioSuccess('')
        try {
            const response = await fetch(`${API_URL}/api/v1/inventario/movimientos`, {
                method: 'POST',
                headers: authHeaders(),
                body: JSON.stringify({
                    producto_id: Number(movimientoForm.producto_id),
                    tipo: movimientoForm.tipo,
                    cantidad: Number(movimientoForm.cantidad),
                    observacion: movimientoForm.observacion.trim() || undefined,
                }),
            })
            const data = await response.json()
            if (!response.ok) {
                setInventarioError(data.detail || 'No fue posible registrar el movimiento')
                return
            }

            setInventarioSuccess(`${data.tipo} registrada. Stock actual de ${data.producto_nombre}: ${data.stock_nuevo}`)
            setMovimientoForm((current) => ({ ...current, cantidad: 1, observacion: '' }))
            await loadInventario()
        } catch (error) {
            console.error(error)
            setInventarioError('No fue posible registrar el movimiento')
        } finally {
            setIsSavingMovimiento(false)
        }
    }

    const crearDevolucion = async (event) => {
        event.preventDefault()
        setIsSavingDevolucion(true)
        setDevolucionesError('')
        setDevolucionesSuccess('')
        try {
            const response = await fetch(`${API_URL}/api/v1/devoluciones`, {
                method: 'POST',
                headers: authHeaders(),
                body: JSON.stringify({
                    pedido_id: Number(devolucionForm.pedido_id),
                    motivo: devolucionForm.motivo.trim(),
                }),
            })
            const data = await response.json()
            if (!response.ok) {
                setDevolucionesError(data.detail || 'No fue posible crear la solicitud')
                return
            }

            setDevolucionesSuccess(`Devolucion solicitada para el pedido #${data.pedido_id}`)
            setDevolucionForm((current) => ({ ...current, motivo: '' }))
            await loadDevoluciones()
        } catch (error) {
            console.error(error)
            setDevolucionesError('No fue posible crear la solicitud')
        } finally {
            setIsSavingDevolucion(false)
        }
    }

    const decidirDevolucion = async (devolucion, estado) => {
        setIsSavingDevolucion(true)
        setDevolucionesError('')
        setDevolucionesSuccess('')
        try {
            const monto = Number(refundAmounts[devolucion.id] || 0)
            const response = await fetch(`${API_URL}/api/v1/devoluciones/${devolucion.id}`, {
                method: 'PATCH',
                headers: authHeaders(),
                body: JSON.stringify({
                    estado,
                    ...(estado === 'Aprobada' ? { monto_reembolso: monto } : {}),
                }),
            })
            const data = await response.json()
            if (!response.ok) {
                setDevolucionesError(data.detail || 'No fue posible gestionar la devolucion')
                return
            }

            setDevolucionesSuccess(`Devolucion #${data.id} marcada como ${data.estado}`)
            setRefundAmounts((current) => ({ ...current, [devolucion.id]: '' }))
            await loadDevoluciones()
        } catch (error) {
            console.error(error)
            setDevolucionesError('No fue posible gestionar la devolucion')
        } finally {
            setIsSavingDevolucion(false)
        }
    }

    const renderUsuarios = () => (
        <div className="admin-two-column">
            <section style={{ background: 'var(--surface)', borderRadius: '0.75rem', padding: '1.5rem', boxShadow: 'var(--shadow)', border: '1px solid var(--border)' }}>
                <h2 style={{ fontSize: '1.2rem', marginBottom: '1rem', color: 'var(--text-strong)' }}>Registrar empleado</h2>
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

            <section style={{ background: 'var(--surface)', borderRadius: '0.75rem', padding: '1.5rem', boxShadow: 'var(--shadow)', border: '1px solid var(--border)', overflowX: 'auto' }}>
                <h2 style={{ fontSize: '1.2rem', marginBottom: '1rem', color: 'var(--text-strong)' }}>Empleados registrados</h2>
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
                                <td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-light)' }}>No hay empleados registrados</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </section>
        </div>
    )

    const renderEnvios = () => {
        const pedidosDisponibles = pedidosEnvio.filter((pedido) => !pedido.ya_tiene_envio)
        return (
            <div className="shipping-layout">
                <section className="admin-card">
                    <div className="section-heading">
                        <div>
                            <span className="order-kicker">Despacho</span>
                            <h2>Registrar envio</h2>
                        </div>
                        <button type="button" className="table-action" onClick={loadEnvios} disabled={isLoadingEnvios}>
                            {isLoadingEnvios ? 'Actualizando...' : 'Actualizar'}
                        </button>
                    </div>
                    <form onSubmit={crearEnvio} className="admin-form">
                        <label>
                            Pedido pagado
                            <select className="auth-input" value={envioForm.pedido_id} required onChange={(event) => updateEnvioForm('pedido_id', event.target.value)}>
                                <option value="">Selecciona un pedido</option>
                                {pedidosDisponibles.map((pedido) => (
                                    <option key={pedido.id} value={pedido.id}>
                                        #{pedido.id} - {pedido.cliente_nombre} - {formatPrice(pedido.total_compra)}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <label>
                            Empresa transportadora
                            <input className="auth-input" value={envioForm.empresa_transporte} required minLength={2} maxLength={100} onChange={(event) => updateEnvioForm('empresa_transporte', event.target.value)} />
                        </label>
                        <label>
                            Codigo de seguimiento
                            <input className="auth-input" value={envioForm.codigo_seguimiento} required minLength={3} maxLength={45} placeholder="SEG-000123" onChange={(event) => updateEnvioForm('codigo_seguimiento', event.target.value)} />
                        </label>
                        <label>
                            Fecha estimada de entrega
                            <input className="auth-input" type="date" value={envioForm.fecha_entrega_estimada} onChange={(event) => updateEnvioForm('fecha_entrega_estimada', event.target.value)} />
                        </label>
                        {enviosError && <p className="inline-message error">{enviosError}</p>}
                        {envioSuccess && <p className="inline-message success">{envioSuccess}</p>}
                        <button type="submit" className="btn btn-primary" disabled={isSavingEnvio || pedidosDisponibles.length === 0}>
                            {isSavingEnvio ? 'Guardando...' : 'Crear envio en ruta'}
                        </button>
                        {pedidosDisponibles.length === 0 && <p style={{ color: 'var(--text-light)', fontSize: '0.9rem' }}>No hay pedidos pagados pendientes de despacho.</p>}
                    </form>
                </section>

                <section className="admin-card">
                    <div className="section-heading">
                        <div>
                            <span className="order-kicker">Tracking</span>
                            <h2>Envios registrados</h2>
                        </div>
                    </div>
                    <div style={{ overflowX: 'auto' }}>
                        <table className="premium-table shipping-table">
                            <thead>
                                <tr>
                                    <th>Envio</th>
                                    <th>Pedido</th>
                                    <th>Cliente</th>
                                    <th>Transportadora</th>
                                    <th>Codigo</th>
                                    <th>Estado</th>
                                    <th>Entrega</th>
                                    <th>Accion</th>
                                </tr>
                            </thead>
                            <tbody>
                                {envios.map((envio) => (
                                    <tr key={envio.id}>
                                        <td>#{envio.id}</td>
                                        <td>#{envio.pedido_id}</td>
                                        <td>{envio.cliente_nombre || 'Sin cliente'}</td>
                                        <td>{envio.empresa_transporte}</td>
                                        <td><code>{envio.codigo_seguimiento}</code></td>
                                        <td><span className={`badge ${getShippingBadgeClass(envio.estado)}`}>{envio.estado}</span></td>
                                        <td>{formatDate(envio.fecha_entrega_estimada)}</td>
                                        <td>
                                            <button type="button" className="table-action" onClick={() => startEditEnvio(envio)}>
                                                Editar
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {envios.length === 0 && (
                                    <tr>
                                        <td colSpan="8" style={{ textAlign: 'center', color: 'var(--text-light)' }}>Todavia no hay envios registrados.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>

                {editingEnvioId && (
                    <section className="admin-card shipping-edit-card">
                        <div className="section-heading">
                            <div>
                                <span className="order-kicker">Actualizacion</span>
                                <h2>Editar envio #{editingEnvioId}</h2>
                            </div>
                            <button type="button" className="icon-close" onClick={() => setEditingEnvioId(null)}>x</button>
                        </div>
                        <form onSubmit={actualizarEnvio} className="admin-form admin-form-inline">
                            <label>
                                Transportadora
                                <input className="auth-input" value={trackingForm.empresa_transporte} required minLength={2} maxLength={100} onChange={(event) => updateTrackingForm('empresa_transporte', event.target.value)} />
                            </label>
                            <label>
                                Codigo
                                <input className="auth-input" value={trackingForm.codigo_seguimiento} required minLength={3} maxLength={45} onChange={(event) => updateTrackingForm('codigo_seguimiento', event.target.value)} />
                            </label>
                            <label>
                                Estado
                                <select className="auth-input" value={trackingForm.estado} onChange={(event) => updateTrackingForm('estado', event.target.value)}>
                                    <option value="En ruta">En ruta</option>
                                    <option value="Entregado">Entregado</option>
                                    <option value="Cancelado">Cancelado</option>
                                </select>
                            </label>
                            <label>
                                Entrega estimada
                                <input className="auth-input" type="date" value={trackingForm.fecha_entrega_estimada} onChange={(event) => updateTrackingForm('fecha_entrega_estimada', event.target.value)} />
                            </label>
                            <button type="submit" className="btn btn-primary" disabled={isSavingEnvio}>
                                {isSavingEnvio ? 'Guardando...' : 'Guardar tracking'}
                            </button>
                        </form>
                    </section>
                )}
            </div>
        )
    }

    const renderInventario = () => (
        <div className="shipping-layout">
            <section className="admin-card">
                <div className="section-heading">
                    <div>
                        <span className="order-kicker">Auditoria</span>
                        <h2>Registrar movimiento</h2>
                    </div>
                    <button type="button" className="table-action" onClick={loadInventario}>Actualizar</button>
                </div>
                <form onSubmit={registrarMovimiento} className="admin-form">
                    <label>
                        Producto
                        <select className="auth-input" value={movimientoForm.producto_id} required onChange={(event) => updateMovimientoForm('producto_id', event.target.value)}>
                            <option value="">Selecciona producto</option>
                            {productosInventario.map((producto) => (
                                <option key={producto.id} value={producto.id}>
                                    {producto.nombre} - Stock {producto.stock_actual}
                                </option>
                            ))}
                        </select>
                    </label>
                    <label>
                        Tipo de movimiento
                        <select className="auth-input" value={movimientoForm.tipo} required onChange={(event) => updateMovimientoForm('tipo', event.target.value)}>
                            <option value="Entrada">Entrada</option>
                            <option value="Salida">Salida</option>
                            <option value="Devolución">Devolución</option>
                        </select>
                    </label>
                    <label>
                        Cantidad
                        <input className="auth-input" type="number" min="1" value={movimientoForm.cantidad} required onChange={(event) => updateMovimientoForm('cantidad', event.target.value)} />
                    </label>
                    <label>
                        Observacion
                        <textarea className="auth-input" rows="4" maxLength="255" value={movimientoForm.observacion} placeholder="Ej. Merma por golpe en bodega" onChange={(event) => updateMovimientoForm('observacion', event.target.value)} />
                    </label>
                    {inventarioError && <p className="inline-message error">{inventarioError}</p>}
                    {inventarioSuccess && <p className="inline-message success">{inventarioSuccess}</p>}
                    <button type="submit" className="btn btn-primary" disabled={isSavingMovimiento}>
                        {isSavingMovimiento ? 'Guardando...' : 'Registrar movimiento'}
                    </button>
                </form>
            </section>

            <section className="admin-card">
                <div className="section-heading">
                    <div>
                        <span className="order-kicker">Historial</span>
                        <h2>Movimientos recientes</h2>
                    </div>
                </div>
                <div style={{ overflowX: 'auto' }}>
                    <table className="premium-table shipping-table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Producto</th>
                                <th>Tipo</th>
                                <th>Cantidad</th>
                                <th>Stock</th>
                                <th>Empleado</th>
                                <th>Fecha</th>
                                <th>Observacion</th>
                            </tr>
                        </thead>
                        <tbody>
                            {movimientosInventario.map((movimiento) => (
                                <tr key={movimiento.id}>
                                    <td>#{movimiento.id}</td>
                                    <td>{movimiento.producto_nombre}</td>
                                    <td><span className={`badge ${movimiento.tipo === 'Salida' ? 'badge-expired' : 'badge-success'}`}>{movimiento.tipo}</span></td>
                                    <td>{movimiento.cantidad}</td>
                                    <td>{movimiento.stock_nuevo}</td>
                                    <td>{movimiento.empleado_nombre}</td>
                                    <td>{formatDate(movimiento.fecha)}</td>
                                    <td>{movimiento.observacion || 'Sin observacion'}</td>
                                </tr>
                            ))}
                            {movimientosInventario.length === 0 && (
                                <tr>
                                    <td colSpan="8" style={{ textAlign: 'center', color: 'var(--text-light)' }}>No hay movimientos registrados.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    )

    const renderDevoluciones = () => (
        <div className="shipping-layout">
            <section className="admin-card">
                <div className="section-heading">
                    <div>
                        <span className="order-kicker">Solicitud</span>
                        <h2>Crear devolucion</h2>
                    </div>
                    <button type="button" className="table-action" onClick={loadDevoluciones}>Actualizar</button>
                </div>
                <form onSubmit={crearDevolucion} className="admin-form">
                    <label>
                        Pedido pagado
                        <select className="auth-input" value={devolucionForm.pedido_id} required onChange={(event) => updateDevolucionForm('pedido_id', event.target.value)}>
                            <option value="">Selecciona pedido</option>
                            {pedidosDevolucion.map((pedido) => (
                                <option key={pedido.id} value={pedido.id}>
                                    #{pedido.id} - {pedido.cliente_nombre} - {formatPrice(pedido.total_compra)}
                                </option>
                            ))}
                        </select>
                    </label>
                    <label>
                        Motivo
                        <textarea className="auth-input" rows="5" minLength="5" maxLength="255" value={devolucionForm.motivo} required placeholder="Ej. Producto con dano reportado por el cliente" onChange={(event) => updateDevolucionForm('motivo', event.target.value)} />
                    </label>
                    {devolucionesError && <p className="inline-message error">{devolucionesError}</p>}
                    {devolucionesSuccess && <p className="inline-message success">{devolucionesSuccess}</p>}
                    <button type="submit" className="btn btn-primary" disabled={isSavingDevolucion}>
                        {isSavingDevolucion ? 'Guardando...' : 'Crear solicitud'}
                    </button>
                </form>
            </section>

            <section className="admin-card">
                <div className="section-heading">
                    <div>
                        <span className="order-kicker">Gestion</span>
                        <h2>Solicitudes pendientes</h2>
                    </div>
                </div>
                <div style={{ overflowX: 'auto' }}>
                    <table className="premium-table shipping-table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Pedido</th>
                                <th>Cliente</th>
                                <th>Motivo</th>
                                <th>Total</th>
                                <th>Reembolso</th>
                                <th>Estado</th>
                                <th>Accion</th>
                            </tr>
                        </thead>
                        <tbody>
                            {devoluciones.map((devolucion) => (
                                <tr key={devolucion.id}>
                                    <td>#{devolucion.id}</td>
                                    <td>#{devolucion.pedido_id}</td>
                                    <td>{devolucion.cliente_nombre}</td>
                                    <td>{devolucion.motivo}</td>
                                    <td>{formatPrice(devolucion.pedido_total)}</td>
                                    <td>
                                        <input
                                            className="table-input"
                                            type="number"
                                            min="1"
                                            max={devolucion.pedido_total || undefined}
                                            value={refundAmounts[devolucion.id] || ''}
                                            placeholder="0"
                                            onChange={(event) => setRefundAmounts((current) => ({ ...current, [devolucion.id]: event.target.value }))}
                                        />
                                    </td>
                                    <td><span className="badge badge-pending">{devolucion.estado}</span></td>
                                    <td>
                                        <div className="order-inline-actions">
                                            <button type="button" className="table-action" disabled={isSavingDevolucion} onClick={() => decidirDevolucion(devolucion, 'Aprobada')}>
                                                Aprobar
                                            </button>
                                            <button type="button" className="table-action table-action-danger" disabled={isSavingDevolucion} onClick={() => decidirDevolucion(devolucion, 'Rechazada')}>
                                                Rechazar
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {devoluciones.length === 0 && (
                                <tr>
                                    <td colSpan="8" style={{ textAlign: 'center', color: 'var(--text-light)' }}>No hay solicitudes en estado Solicitada.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
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
                            <p style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-strong)' }}>Hola, <span style={{ fontWeight: 800 }}>{currentUser?.name || 'Usuario'}</span></p>
                            {currentUser?.email && <p style={{ fontSize: '0.78rem', color: 'var(--text-light)' }}>{currentRoleId === 1 ? 'Master Admin' : 'Empleado'} - {currentUser.email}</p>}
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

                        <div style={{ background: 'var(--surface)', borderRadius: '0.75rem', padding: '2rem', boxShadow: 'var(--shadow)', border: '1px solid var(--border)' }}>
                            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem', color: 'var(--text-strong)' }}>Ultimos Pedidos</h2>
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

                {activeTab === 'usuarios' && canManageUsers && renderUsuarios()}
                {activeTab === 'envios' && renderEnvios()}
                {activeTab === 'inventario' && renderInventario()}
                {activeTab === 'devolucion' && renderDevoluciones()}

                {['pedido', 'facturacion', 'config'].includes(activeTab) && (
                    <div style={{ background: 'var(--surface)', borderRadius: '0.75rem', padding: '3rem', textAlign: 'center', boxShadow: 'var(--shadow)', border: '1px solid var(--border)' }}>
                        <h2 style={{ color: 'var(--text-strong)', marginBottom: '1rem' }}>Modulo de {activeLabel}</h2>
                        <p style={{ color: 'var(--text-light)' }}>Este modulo esta siendo actualizado con el nuevo diseno de alta fidelidad.</p>
                    </div>
                )}
            </main>
        </div>
    )
}

export default Dashboard
