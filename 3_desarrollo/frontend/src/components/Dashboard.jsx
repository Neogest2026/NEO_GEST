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

const resolveImageUrl = (url) => {
    if (!url) return '/images/hero.png'
    if (url.startsWith('/static/')) return `${API_URL}${url}`
    return url
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

const getOrderBadgeClass = (status) => {
    const classes = {
        Pendiente: 'badge-pending',
        Pagado: 'badge-paid',
        Cancelado: 'badge-cancelled',
        Vencido: 'badge-expired',
        Entregado: 'badge-success',
    }
    return classes[status] || 'badge-neutral'
}

const getStockBadgeClass = (status) => {
    const classes = {
        Disponible: 'badge-success',
        Bajo: 'badge-pending',
        Agotado: 'badge-expired',
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
    const [enviosResumen, setEnviosResumen] = useState({
        total_envios: 0,
        pendientes_despacho: 0,
        en_ruta: 0,
        entregados: 0,
        cancelados: 0,
    })
    const [enviosError, setEnviosError] = useState('')
    const [envioSuccess, setEnvioSuccess] = useState('')
    const [isLoadingEnvios, setIsLoadingEnvios] = useState(false)
    const [isSavingEnvio, setIsSavingEnvio] = useState(false)
    const [selectedEnvio, setSelectedEnvio] = useState(null)
    const [envioFilters, setEnvioFilters] = useState({
        id: '',
        pedido: '',
        cliente: '',
        transportadora: '',
        codigo: '',
        estado: '',
        entrega: '',
        productos: '',
    })
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
    const [inventarioResumen, setInventarioResumen] = useState({
        total_productos: 0,
        total_unidades: 0,
        productos_bajo_stock: 0,
        productos_agotados: 0,
        valor_inventario: 0,
    })
    const [inventarioError, setInventarioError] = useState('')
    const [inventarioSuccess, setInventarioSuccess] = useState('')
    const [isSavingMovimiento, setIsSavingMovimiento] = useState(false)
    const [selectedInventoryProduct, setSelectedInventoryProduct] = useState(null)
    const [inventoryFilters, setInventoryFilters] = useState({
        producto: '',
        categoria: '',
        estado: '',
    })
    const [movimientoForm, setMovimientoForm] = useState({
        producto_id: '',
        tipo: 'Entrada',
        cantidad: 1,
        observacion: '',
    })
    const [categoriasInventario, setCategoriasInventario] = useState([])
    const [isSavingProducto, setIsSavingProducto] = useState(false)
    const [productoImagePreview, setProductoImagePreview] = useState('')
    const [productoToDelete, setProductoToDelete] = useState(null)
    const [isDeletingProducto, setIsDeletingProducto] = useState(false)
    const [productoForm, setProductoForm] = useState({
        nombre: '',
        descripcion: '',
        categoria_id: '',
        precio_unitario: '',
        stock_actual: 0,
        dimensiones: '',
        peso: '',
        imagen_url: '',
        imagen: null,
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
    const [dashboardData, setDashboardData] = useState({
        metricas: {
            ventas_totales: 0,
            pedidos_pendientes: 0,
            productos_en_stock: 0,
            productos_bajo_stock: 0,
            productos_agotados: 0,
            envios_en_transito: 0,
            pedidos_pagados: 0,
        },
        ultimos_pedidos: [],
    })
    const [dashboardError, setDashboardError] = useState('')
    const [isLoadingDashboard, setIsLoadingDashboard] = useState(false)
    const [selectedDashboardOrder, setSelectedDashboardOrder] = useState(null)
    const [orderFilters, setOrderFilters] = useState({
        id: '',
        cliente: '',
        fecha: '',
        total: '',
        estado: '',
        productos: '',
    })
    const [pedidosAdminData, setPedidosAdminData] = useState({
        metricas: {
            total_pedidos: 0,
            pendientes: 0,
            pagados: 0,
            cancelados: 0,
            vencidos: 0,
            ventas_pagadas: 0,
            con_envio: 0,
        },
        pedidos: [],
    })
    const [pedidosError, setPedidosError] = useState('')
    const [pedidosSuccess, setPedidosSuccess] = useState('')
    const [isLoadingPedidos, setIsLoadingPedidos] = useState(false)
    const [selectedPedido, setSelectedPedido] = useState(null)
    const [pedidoToCancel, setPedidoToCancel] = useState(null)
    const [cancelingPedidoId, setCancelingPedidoId] = useState(null)
    const [pedidoFilters, setPedidoFilters] = useState({
        id: '',
        cliente: '',
        fecha: '',
        estado: '',
        total: '',
        productos: '',
        pago: '',
        envio: '',
    })

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
        {
            label: 'Ventas Totales',
            value: formatPrice(dashboardData.metricas.ventas_totales),
            change: `${dashboardData.metricas.pedidos_pagados} pedidos pagados`,
            isPositive: true,
        },
        {
            label: 'Pedidos Pendientes',
            value: dashboardData.metricas.pedidos_pendientes,
            change: dashboardData.metricas.pedidos_pendientes > 0 ? 'Requieren atencion' : 'Sin pendientes',
            isPositive: dashboardData.metricas.pedidos_pendientes === 0,
        },
        {
            label: 'Productos en Stock',
            value: dashboardData.metricas.productos_en_stock,
            change: `${dashboardData.metricas.productos_bajo_stock} bajo stock, ${dashboardData.metricas.productos_agotados} agotados`,
            isPositive: dashboardData.metricas.productos_agotados === 0,
        },
        {
            label: 'Envios en Transito',
            value: dashboardData.metricas.envios_en_transito,
            change: dashboardData.metricas.envios_en_transito > 0 ? 'En ruta actualmente' : 'Sin envios en ruta',
            isPositive: true,
        },
    ]

    const authHeaders = useCallback(() => ({
        'Content-Type': 'application/json',
        Authorization: `Bearer ${currentUser?.token}`,
    }), [currentUser?.token])

    const loadDashboard = useCallback(async () => {
        if (!currentUser?.token) return
        setDashboardError('')
        setIsLoadingDashboard(true)
        try {
            const response = await fetch(`${API_URL}/api/v1/dashboard/resumen`, { headers: authHeaders() })
            const data = await response.json()
            if (!response.ok) {
                setDashboardError(data.detail || 'No fue posible cargar el dashboard')
                return
            }
            setDashboardData(data)
            setSelectedDashboardOrder((current) => {
                if (!current) return null
                return data.ultimos_pedidos.find((order) => order.id === current.id) || null
            })
        } catch (error) {
            console.error(error)
            setDashboardError('No fue posible conectar con el dashboard')
        } finally {
            setIsLoadingDashboard(false)
        }
    }, [authHeaders, currentUser?.token])

    useEffect(() => {
        if (activeTab === 'dashboard') {
            loadDashboard()
        }
    }, [activeTab, loadDashboard])

    const loadPedidosAdmin = useCallback(async () => {
        if (!currentUser?.token) return
        setPedidosError('')
        setIsLoadingPedidos(true)
        try {
            const response = await fetch(`${API_URL}/api/v1/pedidos/admin/resumen`, { headers: authHeaders() })
            const data = await response.json()
            if (!response.ok) {
                setPedidosError(data.detail || 'No fue posible cargar pedidos')
                return
            }
            setPedidosAdminData(data)
            setSelectedPedido((current) => {
                if (!current) return null
                return data.pedidos.find((pedido) => pedido.id === current.id) || null
            })
        } catch (error) {
            console.error(error)
            setPedidosError('No fue posible conectar con pedidos')
        } finally {
            setIsLoadingPedidos(false)
        }
    }, [authHeaders, currentUser?.token])

    useEffect(() => {
        if (activeTab === 'pedido') {
            loadPedidosAdmin()
        }
    }, [activeTab, loadPedidosAdmin])

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
                fetch(`${API_URL}/api/v1/envios/resumen`, { headers: authHeaders() }),
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
            setEnviosResumen(enviosData.metricas)
            setEnvios(enviosData.envios)
            setSelectedEnvio((current) => {
                if (!current) return null
                return enviosData.envios.find((envio) => envio.id === current.id) || null
            })
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
            const [resumenResponse, movimientosResponse, categoriasResponse] = await Promise.all([
                fetch(`${API_URL}/api/v1/inventario/resumen`, { headers: authHeaders() }),
                fetch(`${API_URL}/api/v1/inventario/movimientos`, { headers: authHeaders() }),
                fetch(`${API_URL}/api/v1/categorias`, { headers: authHeaders() }),
            ])
            const resumenData = await resumenResponse.json()
            const movimientosData = await movimientosResponse.json()
            const categoriasData = await categoriasResponse.json()

            if (!resumenResponse.ok) {
                setInventarioError(resumenData.detail || 'No fue posible cargar inventario')
                return
            }
            if (!movimientosResponse.ok) {
                setInventarioError(movimientosData.detail || 'No fue posible cargar movimientos')
                return
            }
            if (!categoriasResponse.ok) {
                setInventarioError(categoriasData.detail || 'No fue posible cargar categorias')
                return
            }

            setInventarioResumen(resumenData.metricas)
            setProductosInventario(resumenData.productos)
            setMovimientosInventario(movimientosData)
            setCategoriasInventario(categoriasData)
            setSelectedInventoryProduct((current) => {
                if (!current) return null
                return resumenData.productos.find((producto) => producto.id === current.id) || null
            })
            setMovimientoForm((current) => ({
                ...current,
                producto_id: current.producto_id || resumenData.productos[0]?.id || '',
            }))
            setProductoForm((current) => ({
                ...current,
                categoria_id: current.categoria_id || categoriasData[0]?.id || '',
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

    const updateProductoForm = (field, value) => {
        setProductoForm({ ...productoForm, [field]: value })
    }

    const updateProductoImagen = (file) => {
        setProductoForm({ ...productoForm, imagen: file })
        setProductoImagePreview(file ? URL.createObjectURL(file) : '')
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
            await loadDashboard()
            await loadPedidosAdmin()
            setSelectedEnvio(data)
        } catch (error) {
            console.error(error)
            setEnviosError('No fue posible registrar el envio')
        } finally {
            setIsSavingEnvio(false)
        }
    }

    const startEditEnvio = (envio) => {
        setEditingEnvioId(envio.id)
        setSelectedEnvio(envio)
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
            setSelectedEnvio(data)
            setEnvioSuccess(`Tracking actualizado para el pedido #${data.pedido_id}`)
            await loadEnvios()
            await loadDashboard()
            await loadPedidosAdmin()
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

    const crearProducto = async (event) => {
        event.preventDefault()
        setIsSavingProducto(true)
        setInventarioError('')
        setInventarioSuccess('')
        try {
            const formData = new FormData()
            formData.append('nombre', productoForm.nombre.trim())
            formData.append('descripcion', productoForm.descripcion.trim())
            formData.append('categoria_id', productoForm.categoria_id)
            formData.append('precio_unitario', productoForm.precio_unitario)
            formData.append('stock_actual', productoForm.stock_actual)
            if (productoForm.dimensiones.trim()) formData.append('dimensiones', productoForm.dimensiones.trim())
            if (productoForm.peso) formData.append('peso', productoForm.peso)
            if (productoForm.imagen_url.trim()) formData.append('imagen_url', productoForm.imagen_url.trim())
            if (productoForm.imagen) {
                formData.append('imagen', productoForm.imagen)
            }

            const response = await fetch(`${API_URL}/api/v1/inventario/productos`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${currentUser?.token}`,
                },
                body: formData,
            })
            const data = await response.json()
            if (!response.ok) {
                setInventarioError(data.detail || 'No fue posible crear el producto')
                return
            }

            setInventarioSuccess(`Producto ${data.nombre} creado con stock inicial ${data.stock_actual}`)
            setProductoForm({
                nombre: '',
                descripcion: '',
                categoria_id: categoriasInventario[0]?.id || '',
                precio_unitario: '',
                stock_actual: 0,
                dimensiones: '',
                peso: '',
                imagen_url: '',
                imagen: null,
            })
            setProductoImagePreview('')
            setSelectedInventoryProduct(data)
            await loadInventario()
        } catch (error) {
            console.error(error)
            setInventarioError('No fue posible crear el producto')
        } finally {
            setIsSavingProducto(false)
        }
    }

    const eliminarProducto = async () => {
        if (!productoToDelete) return
        setIsDeletingProducto(true)
        setInventarioError('')
        setInventarioSuccess('')
        try {
            const response = await fetch(`${API_URL}/api/v1/inventario/productos/${productoToDelete.id}`, {
                method: 'DELETE',
                headers: authHeaders(),
            })
            const data = await response.json()
            if (!response.ok) {
                setInventarioError(data.detail || 'No fue posible eliminar el producto')
                return
            }

            setInventarioSuccess(`Producto ${data.nombre} eliminado del catalogo activo`)
            setProductoToDelete(null)
            setSelectedInventoryProduct((current) => current?.id === data.id ? null : current)
            await loadInventario()
        } catch (error) {
            console.error(error)
            setInventarioError('No fue posible eliminar el producto')
        } finally {
            setIsDeletingProducto(false)
        }
    }

    const cancelarPedidoAdmin = async (pedido) => {
        setCancelingPedidoId(pedido.id)
        setPedidosError('')
        setPedidosSuccess('')
        try {
            const response = await fetch(`${API_URL}/api/v1/pedidos/admin/${pedido.id}/cancelar`, {
                method: 'POST',
                headers: authHeaders(),
            })
            const data = await response.json()
            if (!response.ok) {
                setPedidosError(data.detail || 'No fue posible cancelar el pedido')
                return
            }

            setPedidosSuccess(`Pedido #${data.id} cancelado y stock liberado`)
            setPedidoToCancel(null)
            setSelectedPedido(data)
            await loadPedidosAdmin()
            if (activeTab === 'dashboard') {
                await loadDashboard()
            }
        } catch (error) {
            console.error(error)
            setPedidosError('No fue posible cancelar el pedido')
        } finally {
            setCancelingPedidoId(null)
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

    const updateOrderFilter = (field, value) => {
        setOrderFilters({ ...orderFilters, [field]: value })
    }

    const filterText = (value) => String(value || '').toLowerCase()
    const filteredDashboardOrders = dashboardData.ultimos_pedidos.filter((order) => {
        const id = `#${order.id}`
        const cliente = order.cliente?.nombre || ''
        const fecha = formatDate(order.fecha_creacion)
        const total = formatPrice(order.total_compra)
        const estado = order.estado || ''
        const productos = order.productos || ''

        return (
            filterText(id).includes(filterText(orderFilters.id)) &&
            filterText(cliente).includes(filterText(orderFilters.cliente)) &&
            filterText(fecha).includes(filterText(orderFilters.fecha)) &&
            filterText(total).includes(filterText(orderFilters.total)) &&
            filterText(estado).includes(filterText(orderFilters.estado)) &&
            filterText(productos).includes(filterText(orderFilters.productos))
        )
    })

    const clearOrderFilters = () => {
        setOrderFilters({
            id: '',
            cliente: '',
            fecha: '',
            total: '',
            estado: '',
            productos: '',
        })
    }

    const updateInventoryFilter = (field, value) => {
        setInventoryFilters({ ...inventoryFilters, [field]: value })
    }

    const selectInventoryProduct = (producto, tipo = 'Entrada') => {
        setSelectedInventoryProduct(producto)
        setMovimientoForm((current) => ({
            ...current,
            producto_id: producto.id,
            tipo,
        }))
    }

    const filteredInventoryProducts = productosInventario.filter((producto) => {
        const nombre = producto.nombre || ''
        const categoria = producto.categoria || ''
        const estado = producto.estado_stock || ''

        return (
            filterText(nombre).includes(filterText(inventoryFilters.producto)) &&
            filterText(categoria).includes(filterText(inventoryFilters.categoria)) &&
            filterText(estado).includes(filterText(inventoryFilters.estado))
        )
    })

    const clearInventoryFilters = () => {
        setInventoryFilters({
            producto: '',
            categoria: '',
            estado: '',
        })
    }

    const inventoryStats = [
        {
            label: 'Unidades disponibles',
            value: inventarioResumen.total_unidades,
            change: `${inventarioResumen.total_productos} productos activos`,
            isPositive: inventarioResumen.productos_agotados === 0,
        },
        {
            label: 'Bajo stock',
            value: inventarioResumen.productos_bajo_stock,
            change: inventarioResumen.productos_bajo_stock > 0 ? 'Revisar reposicion' : 'Sin alertas bajas',
            isPositive: inventarioResumen.productos_bajo_stock === 0,
        },
        {
            label: 'Agotados',
            value: inventarioResumen.productos_agotados,
            change: inventarioResumen.productos_agotados > 0 ? 'No disponibles para clientes' : 'Catalogo disponible',
            isPositive: inventarioResumen.productos_agotados === 0,
        },
        {
            label: 'Valor inventario',
            value: formatPrice(inventarioResumen.valor_inventario),
            change: 'Stock x precio actual',
            isPositive: true,
        },
    ]

    const updatePedidoFilter = (field, value) => {
        setPedidoFilters({ ...pedidoFilters, [field]: value })
    }

    const clearPedidoFilters = () => {
        setPedidoFilters({
            id: '',
            cliente: '',
            fecha: '',
            estado: '',
            total: '',
            productos: '',
            pago: '',
            envio: '',
        })
    }

    const filteredPedidosAdmin = pedidosAdminData.pedidos.filter((pedido) => {
        const pago = pedido.pago?.estado_transaccion || 'Sin pago'
        const envio = pedido.envio?.estado || 'Sin envio'
        return (
            filterText(`#${pedido.id}`).includes(filterText(pedidoFilters.id)) &&
            filterText(pedido.cliente?.nombre).includes(filterText(pedidoFilters.cliente)) &&
            filterText(formatDate(pedido.fecha_creacion)).includes(filterText(pedidoFilters.fecha)) &&
            filterText(pedido.estado).includes(filterText(pedidoFilters.estado)) &&
            filterText(formatPrice(pedido.total_compra)).includes(filterText(pedidoFilters.total)) &&
            filterText(pedido.productos).includes(filterText(pedidoFilters.productos)) &&
            filterText(pago).includes(filterText(pedidoFilters.pago)) &&
            filterText(envio).includes(filterText(pedidoFilters.envio))
        )
    })

    const pedidosStats = [
        {
            label: 'Pedidos Totales',
            value: pedidosAdminData.metricas.total_pedidos,
            change: `${filteredPedidosAdmin.length} visibles con filtros`,
            isPositive: true,
        },
        {
            label: 'Pendientes',
            value: pedidosAdminData.metricas.pendientes,
            change: pedidosAdminData.metricas.pendientes > 0 ? 'Esperando pago' : 'Sin pendientes',
            isPositive: pedidosAdminData.metricas.pendientes === 0,
        },
        {
            label: 'Pagados',
            value: pedidosAdminData.metricas.pagados,
            change: `${pedidosAdminData.metricas.con_envio} con envio registrado`,
            isPositive: true,
        },
        {
            label: 'Ventas Pagadas',
            value: formatPrice(pedidosAdminData.metricas.ventas_pagadas),
            change: 'Pagos aprobados',
            isPositive: true,
        },
    ]

    const updateEnvioFilter = (field, value) => {
        setEnvioFilters({ ...envioFilters, [field]: value })
    }

    const clearEnvioFilters = () => {
        setEnvioFilters({
            id: '',
            pedido: '',
            cliente: '',
            transportadora: '',
            codigo: '',
            estado: '',
            entrega: '',
            productos: '',
        })
    }

    const filteredEnvios = envios.filter((envio) => (
        filterText(`#${envio.id}`).includes(filterText(envioFilters.id)) &&
        filterText(`#${envio.pedido_id}`).includes(filterText(envioFilters.pedido)) &&
        filterText(envio.cliente_nombre).includes(filterText(envioFilters.cliente)) &&
        filterText(envio.empresa_transporte).includes(filterText(envioFilters.transportadora)) &&
        filterText(envio.codigo_seguimiento).includes(filterText(envioFilters.codigo)) &&
        filterText(envio.estado).includes(filterText(envioFilters.estado)) &&
        filterText(formatDate(envio.fecha_entrega_estimada)).includes(filterText(envioFilters.entrega)) &&
        filterText(envio.productos).includes(filterText(envioFilters.productos))
    ))

    const enviosStats = [
        {
            label: 'Pendientes despacho',
            value: enviosResumen.pendientes_despacho,
            change: enviosResumen.pendientes_despacho > 0 ? 'Pedidos pagados sin envio' : 'Sin pendientes',
            isPositive: enviosResumen.pendientes_despacho === 0,
        },
        {
            label: 'En ruta',
            value: enviosResumen.en_ruta,
            change: 'Despachos activos',
            isPositive: true,
        },
        {
            label: 'Entregados',
            value: enviosResumen.entregados,
            change: 'Pedidos completados',
            isPositive: true,
        },
        {
            label: 'Total envios',
            value: enviosResumen.total_envios,
            change: `${filteredEnvios.length} visibles con filtros`,
            isPositive: true,
        },
    ]

    const renderDashboard = () => (
        <>
            <div className="stats-grid">
                {stats.map((stat) => (
                    <div key={stat.label} className="stat-card">
                        <span className="stat-label">{stat.label}</span>
                        <span className="stat-value">{stat.value}</span>
                        <div className="stat-footer">
                            <span style={{ color: stat.isPositive ? '#10b981' : '#f59e0b' }}>{stat.change}</span>
                        </div>
                    </div>
                ))}
            </div>

            <div className="admin-card">
                <div className="section-heading">
                    <div>
                        <span className="order-kicker">Operacion en vivo</span>
                        <h2>Ultimos pedidos</h2>
                    </div>
                    <div className="order-inline-actions">
                        <button type="button" className="table-action" onClick={clearOrderFilters}>Limpiar filtros</button>
                        <button type="button" className="table-action" onClick={loadDashboard} disabled={isLoadingDashboard}>
                            {isLoadingDashboard ? 'Actualizando...' : 'Actualizar'}
                        </button>
                    </div>
                </div>

                {dashboardError && <p className="inline-message error">{dashboardError}</p>}

                <div style={{ overflowX: 'auto' }}>
                    <table className="premium-table dashboard-orders-table">
                        <thead>
                            <tr>
                                <th>ID Pedido</th>
                                <th>Cliente</th>
                                <th>Fecha</th>
                                <th>Total</th>
                                <th>Estado</th>
                                <th>Productos</th>
                                <th>Acciones</th>
                            </tr>
                            <tr className="table-filter-row">
                                <th>
                                    <input className="table-filter-input" value={orderFilters.id} placeholder="#72" onChange={(event) => updateOrderFilter('id', event.target.value)} />
                                </th>
                                <th>
                                    <input className="table-filter-input" value={orderFilters.cliente} placeholder="Cliente" onChange={(event) => updateOrderFilter('cliente', event.target.value)} />
                                </th>
                                <th>
                                    <input className="table-filter-input" value={orderFilters.fecha} placeholder="Fecha" onChange={(event) => updateOrderFilter('fecha', event.target.value)} />
                                </th>
                                <th>
                                    <input className="table-filter-input" value={orderFilters.total} placeholder="Total" onChange={(event) => updateOrderFilter('total', event.target.value)} />
                                </th>
                                <th>
                                    <select className="table-filter-input" value={orderFilters.estado} onChange={(event) => updateOrderFilter('estado', event.target.value)}>
                                        <option value="">Todos</option>
                                        <option value="Pendiente">Pendiente</option>
                                        <option value="Pagado">Pagado</option>
                                        <option value="Cancelado">Cancelado</option>
                                        <option value="Vencido">Vencido</option>
                                    </select>
                                </th>
                                <th>
                                    <input className="table-filter-input" value={orderFilters.productos} placeholder="Producto" onChange={(event) => updateOrderFilter('productos', event.target.value)} />
                                </th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredDashboardOrders.map((order) => (
                                <tr key={order.id}>
                                    <td>#{order.id}</td>
                                    <td>{order.cliente?.nombre || 'Sin cliente'}</td>
                                    <td>{formatDate(order.fecha_creacion)}</td>
                                    <td>{formatPrice(order.total_compra)}</td>
                                    <td><span className={`badge ${getOrderBadgeClass(order.estado)}`}>{order.estado}</span></td>
                                    <td className="order-product-name" title={order.productos}>{order.productos || 'Sin productos'}</td>
                                    <td>
                                        <button type="button" className="btn-ver" onClick={() => setSelectedDashboardOrder(order)}>
                                            Ver
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {filteredDashboardOrders.length === 0 && (
                                <tr>
                                    <td colSpan="7" style={{ textAlign: 'center', color: 'var(--text-light)' }}>
                                        No hay pedidos que coincidan con los filtros.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {selectedDashboardOrder && (
                <section className="admin-card order-detail-panel">
                    <div className="section-heading">
                        <div>
                            <span className="order-kicker">Detalle del pedido</span>
                            <h2>Pedido #{selectedDashboardOrder.id}</h2>
                        </div>
                        <button type="button" className="icon-close" onClick={() => setSelectedDashboardOrder(null)}>x</button>
                    </div>
                    <div className="order-detail-grid">
                        <div>
                            <h3>Cliente</h3>
                            <p><strong>{selectedDashboardOrder.cliente?.nombre || 'Sin cliente'}</strong></p>
                            <p>{selectedDashboardOrder.cliente?.telefono || 'Sin telefono'}</p>
                            <p>{selectedDashboardOrder.cliente?.direccion_envio || 'Sin direccion'}</p>
                        </div>
                        <div>
                            <h3>Pedido</h3>
                            <p>Estado: <strong>{selectedDashboardOrder.estado}</strong></p>
                            <p>Fecha: <strong>{formatDate(selectedDashboardOrder.fecha_creacion)}</strong></p>
                            <p>Total: <strong>{formatPrice(selectedDashboardOrder.total_compra)}</strong></p>
                        </div>
                        <div>
                            <h3>Envio</h3>
                            {selectedDashboardOrder.envio ? (
                                <>
                                    <p>Estado: <strong>{selectedDashboardOrder.envio.estado}</strong></p>
                                    <p>{selectedDashboardOrder.envio.empresa_transporte}</p>
                                    <p><code>{selectedDashboardOrder.envio.codigo_seguimiento}</code></p>
                                </>
                            ) : (
                                <p>Sin envio registrado</p>
                            )}
                        </div>
                    </div>
                    <div style={{ overflowX: 'auto', marginTop: '1rem' }}>
                        <table className="premium-table">
                            <thead>
                                <tr>
                                    <th>Producto</th>
                                    <th>Cantidad</th>
                                    <th>Precio</th>
                                    <th>Subtotal</th>
                                </tr>
                            </thead>
                            <tbody>
                                {selectedDashboardOrder.items.map((item) => (
                                    <tr key={item.id}>
                                        <td>{item.producto.nombre}</td>
                                        <td>{item.cantidad}</td>
                                        <td>{formatPrice(item.precio_al_momento)}</td>
                                        <td>{formatPrice(item.subtotal)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>
            )}
        </>
    )

    const renderPedidos = () => (
        <>
            <div className="stats-grid">
                {pedidosStats.map((stat) => (
                    <div key={stat.label} className="stat-card">
                        <span className="stat-label">{stat.label}</span>
                        <span className="stat-value">{stat.value}</span>
                        <div className="stat-footer">
                            <span style={{ color: stat.isPositive ? '#10b981' : '#f59e0b' }}>{stat.change}</span>
                        </div>
                    </div>
                ))}
            </div>

            <section className="admin-card">
                <div className="section-heading">
                    <div>
                        <span className="order-kicker">Operacion en vivo</span>
                        <h2>Pedidos sincronizados</h2>
                    </div>
                    <div className="order-inline-actions">
                        <button type="button" className="table-action" onClick={clearPedidoFilters}>Limpiar filtros</button>
                        <button type="button" className="table-action" onClick={loadPedidosAdmin} disabled={isLoadingPedidos}>
                            {isLoadingPedidos ? 'Actualizando...' : 'Actualizar'}
                        </button>
                    </div>
                </div>

                {pedidosError && <p className="inline-message error">{pedidosError}</p>}
                {pedidosSuccess && <p className="inline-message success">{pedidosSuccess}</p>}

                <div style={{ overflowX: 'auto' }}>
                    <table className="premium-table orders-management-table">
                        <thead>
                            <tr>
                                <th>Pedido</th>
                                <th>Cliente</th>
                                <th>Fecha</th>
                                <th>Estado</th>
                                <th>Total</th>
                                <th>Productos</th>
                                <th>Pago</th>
                                <th>Envio</th>
                                <th>Acciones</th>
                            </tr>
                            <tr className="table-filter-row">
                                <th><input className="table-filter-input" value={pedidoFilters.id} placeholder="#42" onChange={(event) => updatePedidoFilter('id', event.target.value)} /></th>
                                <th><input className="table-filter-input" value={pedidoFilters.cliente} placeholder="Cliente" onChange={(event) => updatePedidoFilter('cliente', event.target.value)} /></th>
                                <th><input className="table-filter-input" value={pedidoFilters.fecha} placeholder="Fecha" onChange={(event) => updatePedidoFilter('fecha', event.target.value)} /></th>
                                <th>
                                    <select className="table-filter-input" value={pedidoFilters.estado} onChange={(event) => updatePedidoFilter('estado', event.target.value)}>
                                        <option value="">Todos</option>
                                        <option value="Pendiente">Pendiente</option>
                                        <option value="Pagado">Pagado</option>
                                        <option value="Cancelado">Cancelado</option>
                                        <option value="Vencido">Vencido</option>
                                    </select>
                                </th>
                                <th><input className="table-filter-input" value={pedidoFilters.total} placeholder="Total" onChange={(event) => updatePedidoFilter('total', event.target.value)} /></th>
                                <th><input className="table-filter-input" value={pedidoFilters.productos} placeholder="Producto" onChange={(event) => updatePedidoFilter('productos', event.target.value)} /></th>
                                <th><input className="table-filter-input" value={pedidoFilters.pago} placeholder="Pago" onChange={(event) => updatePedidoFilter('pago', event.target.value)} /></th>
                                <th><input className="table-filter-input" value={pedidoFilters.envio} placeholder="Envio" onChange={(event) => updatePedidoFilter('envio', event.target.value)} /></th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredPedidosAdmin.map((pedido) => (
                                <tr key={pedido.id}>
                                    <td>#{pedido.id}</td>
                                    <td>{pedido.cliente?.nombre || 'Sin cliente'}</td>
                                    <td>{formatDate(pedido.fecha_creacion)}</td>
                                    <td><span className={`badge ${getOrderBadgeClass(pedido.estado)}`}>{pedido.estado}</span></td>
                                    <td>{formatPrice(pedido.total_compra)}</td>
                                    <td className="order-product-name" title={pedido.productos}>{pedido.productos || 'Sin productos'}</td>
                                    <td>
                                        <span className={`badge ${pedido.pago?.estado_transaccion === 'Aprobado' ? 'badge-success' : 'badge-neutral'}`}>
                                            {pedido.pago?.estado_transaccion || 'Sin pago'}
                                        </span>
                                    </td>
                                    <td>
                                        <span className={`badge ${pedido.envio ? getShippingBadgeClass(pedido.envio.estado) : 'badge-neutral'}`}>
                                            {pedido.envio?.estado || 'Sin envio'}
                                        </span>
                                    </td>
                                    <td>
                                        <div className="order-inline-actions">
                                            <button type="button" className="table-action" onClick={() => setSelectedPedido(pedido)}>Ver</button>
                                            {pedido.estado === 'Pendiente' && (
                                                <button type="button" className="table-action table-action-danger" onClick={() => setPedidoToCancel(pedido)} disabled={cancelingPedidoId === pedido.id}>
                                                    Cancelar
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filteredPedidosAdmin.length === 0 && (
                                <tr>
                                    <td colSpan="9" style={{ textAlign: 'center', color: 'var(--text-light)' }}>
                                        No hay pedidos que coincidan con los filtros.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </section>

            {selectedPedido && (
                <section className="admin-card order-detail-panel">
                    <div className="section-heading">
                        <div>
                            <span className="order-kicker">Detalle operativo</span>
                            <h2>Pedido #{selectedPedido.id}</h2>
                        </div>
                        <button type="button" className="icon-close" onClick={() => setSelectedPedido(null)}>x</button>
                    </div>

                    <div className="order-detail-grid">
                        <div>
                            <h3>Cliente</h3>
                            <p><strong>{selectedPedido.cliente?.nombre || 'Sin cliente'}</strong></p>
                            <p>{selectedPedido.cliente?.telefono || 'Sin telefono'}</p>
                            <p>{selectedPedido.cliente?.direccion_envio || 'Sin direccion de envio'}</p>
                        </div>
                        <div>
                            <h3>Pedido</h3>
                            <p>Estado: <strong>{selectedPedido.estado}</strong></p>
                            <p>Fecha: <strong>{formatDate(selectedPedido.fecha_creacion)}</strong></p>
                            <p>Total: <strong>{formatPrice(selectedPedido.total_compra)}</strong></p>
                        </div>
                        <div>
                            <h3>Pago y factura</h3>
                            {selectedPedido.pago ? (
                                <>
                                    <p>Pago: <strong>{selectedPedido.pago.estado_transaccion}</strong></p>
                                    <p>Metodo: <strong>{selectedPedido.pago.metodo}</strong></p>
                                    <p>Monto: <strong>{formatPrice(selectedPedido.pago.monto)}</strong></p>
                                </>
                            ) : (
                                <p>Sin pago registrado.</p>
                            )}
                            {selectedPedido.factura && (
                                <p>
                                    Factura:{' '}
                                    <a href={`${API_URL}${selectedPedido.factura.url_pdf}`} target="_blank" rel="noreferrer">
                                        {selectedPedido.factura.numero_factura}
                                    </a>
                                </p>
                            )}
                        </div>
                        <div>
                            <h3>Envio</h3>
                            {selectedPedido.envio ? (
                                <>
                                    <p>Estado: <strong>{selectedPedido.envio.estado}</strong></p>
                                    <p>{selectedPedido.envio.empresa_transporte}</p>
                                    <p><code>{selectedPedido.envio.codigo_seguimiento}</code></p>
                                    <p>Entrega: <strong>{formatDate(selectedPedido.envio.fecha_entrega_estimada)}</strong></p>
                                </>
                            ) : (
                                <p>{selectedPedido.estado === 'Pagado' ? 'Listo para registrar envio.' : 'Sin envio registrado.'}</p>
                            )}
                        </div>
                    </div>

                    <div style={{ overflowX: 'auto', marginTop: '1rem' }}>
                        <table className="premium-table">
                            <thead>
                                <tr>
                                    <th>Imagen</th>
                                    <th>Producto</th>
                                    <th>Cantidad</th>
                                    <th>Precio historico</th>
                                    <th>Subtotal</th>
                                </tr>
                            </thead>
                            <tbody>
                                {selectedPedido.items.map((item) => (
                                    <tr key={item.id}>
                                        <td><img className="order-product-thumb" src={resolveImageUrl(item.producto.imagen_url)} alt={item.producto.nombre} /></td>
                                        <td className="order-product-name">{item.producto.nombre}</td>
                                        <td>{item.cantidad}</td>
                                        <td>{formatPrice(item.precio_al_momento)}</td>
                                        <td>{formatPrice(item.subtotal)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>
            )}

            {pedidoToCancel && (
                <div className="modal-backdrop">
                    <div className="payment-modal confirm-modal">
                        <div className="payment-modal-header">
                            <div>
                                <span className="order-kicker">Confirmacion</span>
                                <h2>Cancelar pedido</h2>
                            </div>
                            <button type="button" className="icon-close" onClick={() => setPedidoToCancel(null)} disabled={cancelingPedidoId === pedidoToCancel.id}>x</button>
                        </div>
                        <p className="confirm-copy">
                            El pedido #{pedidoToCancel.id} quedara cancelado y el stock reservado volvera al inventario disponible.
                        </p>
                        <div className="confirm-actions">
                            <button type="button" className="table-action" onClick={() => setPedidoToCancel(null)} disabled={cancelingPedidoId === pedidoToCancel.id}>
                                No, volver
                            </button>
                            <button type="button" className="table-action table-action-danger" onClick={() => cancelarPedidoAdmin(pedidoToCancel)} disabled={cancelingPedidoId === pedidoToCancel.id}>
                                {cancelingPedidoId === pedidoToCancel.id ? 'Cancelando...' : 'Si, cancelar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    )

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
        const pedidoSeleccionado = pedidosDisponibles.find((pedido) => String(pedido.id) === String(envioForm.pedido_id))
        return (
            <>
                <div className="stats-grid">
                    {enviosStats.map((stat) => (
                        <div key={stat.label} className="stat-card">
                            <span className="stat-label">{stat.label}</span>
                            <span className="stat-value">{stat.value}</span>
                            <div className="stat-footer">
                                <span style={{ color: stat.isPositive ? '#10b981' : '#f59e0b' }}>{stat.change}</span>
                            </div>
                        </div>
                    ))}
                </div>

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
                                            #{pedido.id} - {pedido.cliente_nombre} - {pedido.productos || 'Sin productos'} - {formatPrice(pedido.total_compra)}
                                        </option>
                                    ))}
                                </select>
                            </label>
                            {pedidoSeleccionado && (
                                <div className="shipping-pending-card">
                                    <div className="section-heading compact-heading">
                                        <div>
                                            <span className="order-kicker">Pedido listo para despacho</span>
                                            <h3>#{pedidoSeleccionado.id} - {formatPrice(pedidoSeleccionado.total_compra)}</h3>
                                        </div>
                                        <span className="badge badge-success">Pagado</span>
                                    </div>
                                    <div className="shipping-address-block">
                                        <p><strong>{pedidoSeleccionado.cliente_nombre}</strong></p>
                                        <p>{pedidoSeleccionado.cliente_telefono || 'Sin telefono'}</p>
                                        <p>{pedidoSeleccionado.cliente_direccion || 'Sin direccion registrada'}</p>
                                    </div>
                                    {pedidoSeleccionado.items?.length > 0 && (
                                        <div className="shipping-mini-items">
                                            {pedidoSeleccionado.items.slice(0, 3).map((item) => (
                                                <div key={item.id} className="shipping-mini-item">
                                                    <img src={resolveImageUrl(item.producto.imagen_url)} alt={item.producto.nombre} />
                                                    <div>
                                                        <strong>{item.producto.nombre}</strong>
                                                        <span>Cant. {item.cantidad}</span>
                                                    </div>
                                                </div>
                                            ))}
                                            {pedidoSeleccionado.items.length > 3 && <span className="shipping-extra-items">+{pedidoSeleccionado.items.length - 3} productos mas</span>}
                                        </div>
                                    )}
                                </div>
                            )}
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
                            <button type="button" className="table-action" onClick={clearEnvioFilters}>Limpiar filtros</button>
                        </div>
                        <div style={{ overflowX: 'auto' }}>
                            <table className="premium-table shipping-table">
                                <thead>
                                    <tr>
                                        <th>Envio</th>
                                        <th>Pedido</th>
                                        <th>Cliente</th>
                                        <th>Productos</th>
                                        <th>Transportadora</th>
                                        <th>Codigo</th>
                                        <th>Estado</th>
                                        <th>Entrega</th>
                                        <th>Accion</th>
                                    </tr>
                                    <tr className="table-filter-row">
                                        <th><input className="table-filter-input" value={envioFilters.id} placeholder="#12" onChange={(event) => updateEnvioFilter('id', event.target.value)} /></th>
                                        <th><input className="table-filter-input" value={envioFilters.pedido} placeholder="#40" onChange={(event) => updateEnvioFilter('pedido', event.target.value)} /></th>
                                        <th><input className="table-filter-input" value={envioFilters.cliente} placeholder="Cliente" onChange={(event) => updateEnvioFilter('cliente', event.target.value)} /></th>
                                        <th><input className="table-filter-input" value={envioFilters.productos} placeholder="Producto" onChange={(event) => updateEnvioFilter('productos', event.target.value)} /></th>
                                        <th><input className="table-filter-input" value={envioFilters.transportadora} placeholder="Empresa" onChange={(event) => updateEnvioFilter('transportadora', event.target.value)} /></th>
                                        <th><input className="table-filter-input" value={envioFilters.codigo} placeholder="Codigo" onChange={(event) => updateEnvioFilter('codigo', event.target.value)} /></th>
                                        <th>
                                            <select className="table-filter-input" value={envioFilters.estado} onChange={(event) => updateEnvioFilter('estado', event.target.value)}>
                                                <option value="">Todos</option>
                                                <option value="En ruta">En ruta</option>
                                                <option value="Entregado">Entregado</option>
                                                <option value="Cancelado">Cancelado</option>
                                            </select>
                                        </th>
                                        <th><input className="table-filter-input" value={envioFilters.entrega} placeholder="Fecha" onChange={(event) => updateEnvioFilter('entrega', event.target.value)} /></th>
                                        <th></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredEnvios.map((envio) => (
                                        <tr key={envio.id}>
                                            <td>#{envio.id}</td>
                                            <td>#{envio.pedido_id}</td>
                                            <td>{envio.cliente_nombre || 'Sin cliente'}</td>
                                            <td className="order-product-name" title={envio.productos}>{envio.productos || 'Sin productos'}</td>
                                            <td>{envio.empresa_transporte}</td>
                                            <td><code>{envio.codigo_seguimiento}</code></td>
                                            <td><span className={`badge ${getShippingBadgeClass(envio.estado)}`}>{envio.estado}</span></td>
                                            <td>{formatDate(envio.fecha_entrega_estimada)}</td>
                                            <td>
                                                <div className="order-inline-actions">
                                                    <button type="button" className="table-action" onClick={() => setSelectedEnvio(envio)}>Ver</button>
                                                    <button type="button" className="table-action" onClick={() => startEditEnvio(envio)}>Editar</button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {filteredEnvios.length === 0 && (
                                        <tr>
                                            <td colSpan="9" style={{ textAlign: 'center', color: 'var(--text-light)' }}>No hay envios que coincidan con los filtros.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </section>

                    {selectedEnvio && (
                        <section className="admin-card shipping-edit-card">
                            <div className="section-heading">
                                <div>
                                    <span className="order-kicker">Detalle logistico</span>
                                    <h2>Envio #{selectedEnvio.id}</h2>
                                </div>
                                <button type="button" className="icon-close" onClick={() => setSelectedEnvio(null)}>x</button>
                            </div>
                            <div className="order-detail-grid">
                                <div>
                                    <h3>Cliente</h3>
                                    <p><strong>{selectedEnvio.cliente_nombre || 'Sin cliente'}</strong></p>
                                    <p>{selectedEnvio.cliente_telefono || 'Sin telefono'}</p>
                                    <p>{selectedEnvio.cliente_direccion || 'Sin direccion'}</p>
                                </div>
                                <div>
                                    <h3>Pedido</h3>
                                    <p>Pedido: <strong>#{selectedEnvio.pedido_id}</strong></p>
                                    <p>Estado: <strong>{selectedEnvio.pedido_estado}</strong></p>
                                    <p>Total: <strong>{formatPrice(selectedEnvio.pedido_total)}</strong></p>
                                </div>
                                <div>
                                    <h3>Tracking</h3>
                                    <p>Estado: <strong>{selectedEnvio.estado}</strong></p>
                                    <p>{selectedEnvio.empresa_transporte}</p>
                                    <p><code>{selectedEnvio.codigo_seguimiento}</code></p>
                                    <p>Entrega: <strong>{formatDate(selectedEnvio.fecha_entrega_estimada)}</strong></p>
                                </div>
                                <div>
                                    <h3>Empleado</h3>
                                    <p><strong>{selectedEnvio.empleado_nombre || `ID ${selectedEnvio.empleado_id}`}</strong></p>
                                    <p>Despacho: <strong>{formatDate(selectedEnvio.fecha_despacho)}</strong></p>
                                </div>
                            </div>
                            {selectedEnvio.items?.length > 0 && (
                                <div style={{ overflowX: 'auto', marginTop: '1rem' }}>
                                    <table className="premium-table">
                                        <thead>
                                            <tr>
                                                <th>Imagen</th>
                                                <th>Producto</th>
                                                <th>Cantidad</th>
                                                <th>Precio</th>
                                                <th>Subtotal</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {selectedEnvio.items.map((item) => (
                                                <tr key={item.id}>
                                                    <td><img className="order-product-thumb" src={resolveImageUrl(item.producto.imagen_url)} alt={item.producto.nombre} /></td>
                                                    <td className="order-product-name">{item.producto.nombre}</td>
                                                    <td>{item.cantidad}</td>
                                                    <td>{formatPrice(item.precio_al_momento)}</td>
                                                    <td>{formatPrice(item.subtotal)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </section>
                    )}

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
            </>
        )
    }

    const renderInventario = () => (
        <>
            <div className="stats-grid inventory-stats-grid">
                {inventoryStats.map((stat) => (
                    <div key={stat.label} className="stat-card">
                        <span className="stat-label">{stat.label}</span>
                        <span className="stat-value">{stat.value}</span>
                        <div className="stat-footer">
                            <span style={{ color: stat.isPositive ? '#10b981' : '#f59e0b' }}>{stat.change}</span>
                        </div>
                    </div>
                ))}
            </div>

            <div className="inventory-layout">
                <div className="inventory-side-panel">
                <section className="admin-card">
                <div className="section-heading">
                    <div>
                        <span className="order-kicker">Auditoria</span>
                        <h2>Registrar movimiento</h2>
                    </div>
                    <button type="button" className="table-action" onClick={loadInventario}>Actualizar</button>
                </div>

                {selectedInventoryProduct && (
                    <div className="inventory-selected-card">
                        <img src={resolveImageUrl(selectedInventoryProduct.imagen_url)} alt={selectedInventoryProduct.nombre} />
                        <div>
                            <strong>{selectedInventoryProduct.nombre}</strong>
                            <span>Stock actual: {selectedInventoryProduct.stock_actual}</span>
                        </div>
                    </div>
                )}

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
                            <option value="Devolucion">Devolucion</option>
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
                            <span className="order-kicker">Catalogo</span>
                            <h2>Crear producto</h2>
                        </div>
                    </div>
                    <form onSubmit={crearProducto} className="admin-form">
                        <label>
                            Nombre
                            <input className="auth-input" value={productoForm.nombre} required minLength="2" maxLength="80" placeholder="Ej. Sofa Oslo" onChange={(event) => updateProductoForm('nombre', event.target.value)} />
                        </label>
                        <label>
                            Categoria
                            <select className="auth-input" value={productoForm.categoria_id} required onChange={(event) => updateProductoForm('categoria_id', event.target.value)}>
                                <option value="">Selecciona categoria</option>
                                {categoriasInventario.map((categoria) => (
                                    <option key={categoria.id} value={categoria.id}>{categoria.nombre}</option>
                                ))}
                            </select>
                        </label>
                        <div className="admin-form-split">
                            <label>
                                Precio
                                <input className="auth-input" type="number" min="1" step="1" value={productoForm.precio_unitario} required placeholder="1250000" onChange={(event) => updateProductoForm('precio_unitario', event.target.value)} />
                            </label>
                            <label>
                                Stock inicial
                                <input className="auth-input" type="number" min="0" step="1" value={productoForm.stock_actual} required onChange={(event) => updateProductoForm('stock_actual', event.target.value)} />
                            </label>
                        </div>
                        <label>
                            Dimensiones
                            <input className="auth-input" value={productoForm.dimensiones} maxLength="45" placeholder="120 x 60 x 76 cm" onChange={(event) => updateProductoForm('dimensiones', event.target.value)} />
                        </label>
                        <label>
                            Peso kg
                            <input className="auth-input" type="number" min="0" step="0.01" value={productoForm.peso} placeholder="25.5" onChange={(event) => updateProductoForm('peso', event.target.value)} />
                        </label>
                        <label>
                            Descripcion
                            <textarea className="auth-input" rows="3" maxLength="250" value={productoForm.descripcion} placeholder="Descripcion corta para el catalogo" onChange={(event) => updateProductoForm('descripcion', event.target.value)} />
                        </label>
                        <label>
                            Imagen
                            <input className="auth-input" type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={(event) => updateProductoImagen(event.target.files?.[0] || null)} />
                        </label>
                        <label>
                            URL de imagen opcional
                            <input className="auth-input" type="url" value={productoForm.imagen_url} placeholder="https://..." onChange={(event) => updateProductoForm('imagen_url', event.target.value)} />
                        </label>
                        {(productoImagePreview || productoForm.imagen_url) && (
                            <img className="product-image-preview" src={productoImagePreview || productoForm.imagen_url} alt="Vista previa del producto" />
                        )}
                        <button type="submit" className="btn btn-primary" disabled={isSavingProducto}>
                            {isSavingProducto ? 'Creando...' : 'Crear producto'}
                        </button>
                    </form>
                </section>
                </div>

                <section className="admin-card">
                <div className="section-heading">
                    <div>
                        <span className="order-kicker">Stock real</span>
                        <h2>Productos sincronizados</h2>
                    </div>
                    <button type="button" className="table-action" onClick={clearInventoryFilters}>Limpiar filtros</button>
                </div>

                <div style={{ overflowX: 'auto' }}>
                    <table className="premium-table inventory-products-table">
                        <thead>
                            <tr>
                                <th>Imagen</th>
                                <th>Producto</th>
                                <th>Categoria</th>
                                <th>Stock</th>
                                <th>Estado</th>
                                <th>Precio</th>
                                <th>Valor</th>
                                <th>Ultimo movimiento</th>
                                <th>Acciones</th>
                            </tr>
                            <tr className="table-filter-row">
                                <th></th>
                                <th>
                                    <input className="table-filter-input" value={inventoryFilters.producto} placeholder="Producto" onChange={(event) => updateInventoryFilter('producto', event.target.value)} />
                                </th>
                                <th>
                                    <input className="table-filter-input" value={inventoryFilters.categoria} placeholder="Categoria" onChange={(event) => updateInventoryFilter('categoria', event.target.value)} />
                                </th>
                                <th></th>
                                <th>
                                    <select className="table-filter-input" value={inventoryFilters.estado} onChange={(event) => updateInventoryFilter('estado', event.target.value)}>
                                        <option value="">Todos</option>
                                        <option value="Disponible">Disponible</option>
                                        <option value="Bajo">Bajo</option>
                                        <option value="Agotado">Agotado</option>
                                    </select>
                                </th>
                                <th></th>
                                <th></th>
                                <th></th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredInventoryProducts.map((producto) => (
                                <tr key={producto.id}>
                                    <td><img className="order-product-thumb" src={resolveImageUrl(producto.imagen_url)} alt={producto.nombre} /></td>
                                    <td className="order-product-name">{producto.nombre}</td>
                                    <td>{producto.categoria}</td>
                                    <td><strong>{producto.stock_actual}</strong></td>
                                    <td><span className={`badge ${getStockBadgeClass(producto.estado_stock)}`}>{producto.estado_stock}</span></td>
                                    <td>{formatPrice(producto.precio_unitario)}</td>
                                    <td>{formatPrice(producto.valor_stock)}</td>
                                    <td>{producto.ultimo_movimiento ? `${producto.ultimo_movimiento.tipo} - ${formatDate(producto.ultimo_movimiento.fecha)}` : 'Sin auditoria'}</td>
                                    <td>
                                        <div className="inventory-actions">
                                            <button type="button" className="table-action" onClick={() => selectInventoryProduct(producto, 'Entrada')}>Entrada</button>
                                            <button type="button" className="table-action" onClick={() => selectInventoryProduct(producto, 'Salida')}>Salida</button>
                                            <button type="button" className="table-action table-action-danger" onClick={() => setProductoToDelete(producto)}>Eliminar</button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filteredInventoryProducts.length === 0 && (
                                <tr>
                                    <td colSpan="9" style={{ textAlign: 'center', color: 'var(--text-light)' }}>
                                        No hay productos que coincidan con los filtros.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </section>

                <section className="admin-card inventory-history-card">
                <div className="section-heading">
                    <div>
                        <span className="order-kicker">Historial</span>
                        <h2>Movimientos recientes</h2>
                    </div>
                </div>
                <div style={{ overflowX: 'auto' }}>
                    <table className="premium-table inventory-history-table">
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
                                    <td>{movimiento.stock_anterior ?? '-'}{' -> '}{movimiento.stock_nuevo}</td>
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

            {productoToDelete && (
                <div className="modal-backdrop">
                    <div className="payment-modal confirm-modal">
                        <div className="payment-modal-header">
                            <div>
                                <span className="order-kicker">Confirmacion</span>
                                <h2>Eliminar producto</h2>
                            </div>
                            <button type="button" className="icon-close" onClick={() => setProductoToDelete(null)} disabled={isDeletingProducto}>x</button>
                        </div>
                        <div className="confirm-product-summary">
                            <img src={resolveImageUrl(productoToDelete.imagen_url)} alt={productoToDelete.nombre} />
                            <div>
                                <strong>{productoToDelete.nombre}</strong>
                                <span>{productoToDelete.categoria} - Stock {productoToDelete.stock_actual}</span>
                            </div>
                        </div>
                        <p className="confirm-copy">
                            Este producto dejara de aparecer en inventario activo y en el catalogo del cliente. Los pedidos historicos conservaran su informacion.
                        </p>
                        <div className="confirm-actions">
                            <button type="button" className="table-action" onClick={() => setProductoToDelete(null)} disabled={isDeletingProducto}>
                                No, cancelar
                            </button>
                            <button type="button" className="table-action table-action-danger" onClick={eliminarProducto} disabled={isDeletingProducto}>
                                {isDeletingProducto ? 'Eliminando...' : 'Si, eliminar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
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

                {activeTab === 'dashboard' && renderDashboard()}

                {activeTab === 'usuarios' && canManageUsers && renderUsuarios()}
                {activeTab === 'envios' && renderEnvios()}
                {activeTab === 'inventario' && renderInventario()}
                {activeTab === 'pedido' && renderPedidos()}
                {activeTab === 'devolucion' && renderDevoluciones()}

                {['facturacion', 'config'].includes(activeTab) && (
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
