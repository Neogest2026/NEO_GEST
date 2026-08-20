import React, { useEffect, useState } from 'react'
import { Navbar, Hero, Catalog, Login, Dashboard, RegisterModal } from './components'
import { Footer, CartDrawer, OrdersPanel } from './components/Commerce'

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'

function App() {
    const [view, setView] = useState(window.location.hash === '#admin' ? 'admin-login' : 'home')
    const [isRegisterOpen, setIsRegisterOpen] = useState(false)
    const [isCartOpen, setIsCartOpen] = useState(false)
    const [searchTerm, setSearchTerm] = useState('')
    const [cartItems, setCartItems] = useState([])
    const [orders, setOrders] = useState([])
    const [lastOrder, setLastOrder] = useState(null)
    const [paymentResult, setPaymentResult] = useState(null)
    const [paymentPromptOrder, setPaymentPromptOrder] = useState(null)
    const [catalogReloadKey, setCatalogReloadKey] = useState(0)
    const [message, setMessage] = useState(null)
    const [isCheckingOut, setIsCheckingOut] = useState(false)
    const [isPaying, setIsPaying] = useState(false)
    const [currentUser, setCurrentUser] = useState(() => {
        const savedUser = localStorage.getItem('neogest_user')
        return savedUser ? JSON.parse(savedUser) : null
    })

    const showMessage = (text, type = 'success') => {
        setMessage({ text, type })
        window.setTimeout(() => setMessage(null), 4500)
    }

    const authHeaders = () => ({
        'Content-Type': 'application/json',
        ...(currentUser?.token ? { Authorization: `Bearer ${currentUser.token}` } : {}),
    })

    const loadCart = async (userId) => {
        const response = await fetch(`${API_URL}/api/v1/carrito/${userId}`, { headers: authHeaders() })
        if (!response.ok) throw new Error('No fue posible cargar el carrito')
        const data = await response.json()
        setCartItems(data.items)
    }

    const loadOrders = async () => {
        if (!currentUser?.token || currentUser.role !== 'cliente') return
        const response = await fetch(`${API_URL}/api/v1/pedidos/mis-pedidos`, { headers: authHeaders() })
        if (!response.ok) return
        const data = await response.json()
        setOrders(data)
    }

    useEffect(() => {
        const handleHashChange = () => setView(window.location.hash === '#admin' ? 'admin-login' : 'home')
        window.addEventListener('hashchange', handleHashChange)
        return () => window.removeEventListener('hashchange', handleHashChange)
    }, [])

    useEffect(() => {
        if (currentUser?.userId && currentUser.role === 'cliente' && currentUser.token) {
            loadCart(currentUser.userId).catch((error) => {
                console.error(error)
                showMessage('No fue posible cargar el carrito', 'error')
            })
            loadOrders().catch((error) => console.error(error))
        } else {
            setCartItems([])
            setOrders([])
        }
    }, [currentUser])

    const addToCart = async (product) => {
        if (!currentUser || currentUser.role !== 'cliente') {
            showMessage('Inicia sesion como cliente para agregar productos al carrito', 'error')
            setView('login')
            return
        }
        const response = await fetch(`${API_URL}/api/v1/carrito/items`, {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify({ usuario_id: currentUser.userId, producto_id: product.id, cantidad: 1 }),
        })
        const data = await response.json()
        if (!response.ok) {
            showMessage(data.detail || 'No fue posible agregar el producto', 'error')
            return
        }
        setCartItems(data.items)
        setIsCartOpen(true)
        showMessage('Producto agregado al carrito')
    }

    const removeCartItem = async (itemId) => {
        const response = await fetch(`${API_URL}/api/v1/carrito/items/${itemId}?usuario_id=${currentUser.userId}`, {
            method: 'DELETE',
            headers: authHeaders(),
        })
        if (!response.ok) {
            showMessage('No fue posible eliminar el item', 'error')
            return
        }
        await loadCart(currentUser.userId)
    }

    const updateCartItemQuantity = async (item, quantity) => {
        if (quantity < 1) return removeCartItem(item.id)
        const response = await fetch(`${API_URL}/api/v1/carrito/items/${item.id}`, {
            method: 'PATCH',
            headers: authHeaders(),
            body: JSON.stringify({ usuario_id: currentUser.userId, cantidad: quantity }),
        })
        const data = await response.json()
        if (!response.ok) {
            showMessage(data.detail || 'No fue posible actualizar el carrito', 'error')
            return
        }
        setCartItems(data.items)
    }

    const checkoutCart = async () => {
        if (!currentUser || currentUser.role !== 'cliente') {
            showMessage('Inicia sesion como cliente para confirmar el pedido', 'error')
            setView('login')
            return
        }
        if (isCheckingOut) return

        setIsCheckingOut(true)
        const response = await fetch(`${API_URL}/api/v1/carrito/checkout`, {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify({ usuario_id: currentUser.userId }),
        })
        const data = await response.json()
        setIsCheckingOut(false)

        if (!response.ok) {
            showMessage(data.detail || 'No fue posible confirmar el pedido', 'error')
            return
        }
        setCartItems([])
        setIsCartOpen(false)
        setLastOrder(data)
        setPaymentResult(null)
        setPaymentPromptOrder(data)
        setCatalogReloadKey((key) => key + 1)
        await loadOrders()
        showMessage(`Pedido #${data.idPedido} creado. Completa el pago para generar factura`)
    }

    const payOrder = async (order, paymentData) => {
        if (!currentUser || currentUser.role !== 'cliente') {
            showMessage('Inicia sesion como cliente para pagar el pedido', 'error')
            setView('login')
            return { ok: false }
        }
        if (isPaying) return { ok: false }

        const orderId = order.id || order.idPedido
        setIsPaying(true)
        const response = await fetch(`${API_URL}/api/v1/pagos`, {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify({
                pedido_id: orderId,
                metodo: paymentData.metodo,
                ruc_nit_cliente: paymentData.ruc_nit_cliente,
                estado_transaccion: paymentData.estado_transaccion || 'Aprobado',
            }),
        })
        const data = await response.json()
        setIsPaying(false)

        if (!response.ok) {
            showMessage(data.detail || 'No fue posible registrar el pago', 'error')
            return { ok: false, error: data.detail }
        }

        setPaymentResult(data)
        setPaymentPromptOrder(null)
        setLastOrder((prev) => {
            const prevId = prev?.id || prev?.idPedido
            return prevId === orderId ? { ...prev, estado: data.pedido_estado } : prev
        })
        await loadOrders()
        if (data.estado_transaccion === 'Aprobado') {
            showMessage(`Pago aprobado. Factura ${data.factura?.numero_factura || ''}`.trim())
        } else {
            showMessage('Pago rechazado. El pedido sigue pendiente', 'error')
        }
        return { ok: true, data }
    }

    const viewPayment = async (order) => {
        const orderId = order.id || order.idPedido
        const response = await fetch(`${API_URL}/api/v1/pagos/pedido/${orderId}`, { headers: authHeaders() })
        const data = await response.json()
        if (!response.ok) {
            showMessage(data.detail || 'No fue posible consultar el comprobante', 'error')
            return null
        }
        setPaymentResult(data)
        return data
    }

    const handleLogin = (user) => {
        setCurrentUser(user)
        localStorage.setItem('neogest_user', JSON.stringify(user))
        setView(user.role === 'admin' ? 'admin' : 'home')
        showMessage('Sesion iniciada correctamente')
    }

    const logout = () => {
        setCurrentUser(null)
        localStorage.removeItem('neogest_user')
        window.location.hash = ''
        setView('home')
        showMessage('Sesion cerrada')
    }

    return (
        <div className="app-container">
            {message && <div className={`toast-message ${message.type}`}>{message.text}</div>}
            {view === 'home' && <>
                <Navbar onLoginClick={() => setView('login')} onRegisterClick={() => setIsRegisterOpen(true)} onSearch={setSearchTerm} cartItemsCount={cartItems.reduce((total, item) => total + item.cantidad, 0)} onCartClick={() => setIsCartOpen(true)} />
                <Hero />
                <Catalog searchTerm={searchTerm} addToCart={addToCart} reloadKey={catalogReloadKey} />
                {currentUser?.role === 'cliente' && <OrdersPanel lastOrder={lastOrder} orders={orders} onPayOrder={payOrder} onViewPayment={viewPayment} isPaying={isPaying} paymentResult={paymentResult} paymentPromptOrder={paymentPromptOrder} onPaymentPromptClose={() => setPaymentPromptOrder(null)} />}
                <Footer />
                {isRegisterOpen && <RegisterModal onClose={() => setIsRegisterOpen(false)} onRegistered={(text) => showMessage(text)} />}
                <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} items={cartItems} onRemove={removeCartItem} onUpdateQuantity={updateCartItemQuantity} onCheckout={checkoutCart} isCheckingOut={isCheckingOut} />
            </>}
            {(view === 'login' || view === 'admin-login') && <Login onLoginSuccess={handleLogin} onBack={() => setView('home')} isAdminLogin={view === 'admin-login'} />}
            {view === 'admin' && <Dashboard onLogout={logout} currentUser={currentUser} />}
        </div>
    )
}

export default App
