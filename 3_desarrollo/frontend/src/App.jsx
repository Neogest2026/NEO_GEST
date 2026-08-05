import React, { useEffect, useState } from 'react'
import { Navbar, Hero, Catalog, Login, Dashboard, RegisterModal } from './components'
import { Footer, CartDrawer } from './components/Commerce'

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'

function App() {
    const [view, setView] = useState(window.location.hash === '#admin' ? 'admin-login' : 'home')
    const [isRegisterOpen, setIsRegisterOpen] = useState(false)
    const [isCartOpen, setIsCartOpen] = useState(false)
    const [searchTerm, setSearchTerm] = useState('')
    const [cartItems, setCartItems] = useState([])
    const [currentUser, setCurrentUser] = useState(() => {
        const savedUser = localStorage.getItem('neogest_user')
        return savedUser ? JSON.parse(savedUser) : null
    })

    const loadCart = async (userId) => {
        const response = await fetch(`${API_URL}/api/v1/carrito/${userId}`)
        if (!response.ok) throw new Error('No fue posible cargar el carrito')
        const data = await response.json()
        setCartItems(data.items)
    }

    useEffect(() => {
        const handleHashChange = () => setView(window.location.hash === '#admin' ? 'admin-login' : 'home')
        window.addEventListener('hashchange', handleHashChange)
        return () => window.removeEventListener('hashchange', handleHashChange)
    }, [])

    useEffect(() => {
        if (currentUser?.userId && currentUser.role === 'cliente') {
            loadCart(currentUser.userId).catch((error) => console.error(error))
        } else {
            setCartItems([])
        }
    }, [currentUser])

    const addToCart = async (product) => {
        if (!currentUser || currentUser.role !== 'cliente') {
            alert('Inicia sesión como cliente para agregar productos al carrito')
            setView('login')
            return
        }
        const response = await fetch(`${API_URL}/api/v1/carrito/items`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ usuario_id: currentUser.userId, producto_id: product.id, cantidad: 1 }),
        })
        const data = await response.json()
        if (!response.ok) {
            alert(data.detail || 'No fue posible agregar el producto')
            return
        }
        setCartItems(data.items)
        setIsCartOpen(true)
    }

    const removeCartItem = async (itemId) => {
        const response = await fetch(`${API_URL}/api/v1/carrito/items/${itemId}?usuario_id=${currentUser.userId}`, { method: 'DELETE' })
        if (!response.ok) return
        await loadCart(currentUser.userId)
    }

    const updateCartItemQuantity = async (item, quantity) => {
        if (quantity < 1) return removeCartItem(item.id)
        const response = await fetch(`${API_URL}/api/v1/carrito/items/${item.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ usuario_id: currentUser.userId, cantidad: quantity }),
        })
        const data = await response.json()
        if (!response.ok) {
            alert(data.detail || 'No fue posible actualizar el carrito')
            return
        }
        setCartItems(data.items)
    }

    const handleLogin = (user) => {
        setCurrentUser(user)
        localStorage.setItem('neogest_user', JSON.stringify(user))
        setView(user.role === 'admin' ? 'admin' : 'home')
    }

    const logout = () => {
        setCurrentUser(null)
        localStorage.removeItem('neogest_user')
        window.location.hash = ''
        setView('home')
    }

    return (
        <div className="app-container">
            {view === 'home' && <>
                <Navbar onLoginClick={() => setView('login')} onRegisterClick={() => setIsRegisterOpen(true)} onSearch={setSearchTerm} cartItemsCount={cartItems.reduce((total, item) => total + item.cantidad, 0)} onCartClick={() => setIsCartOpen(true)} />
                <Hero />
                <Catalog searchTerm={searchTerm} addToCart={addToCart} />
                <Footer />
                {isRegisterOpen && <RegisterModal onClose={() => setIsRegisterOpen(false)} />}
                <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} items={cartItems} onRemove={removeCartItem} onUpdateQuantity={updateCartItemQuantity} />
            </>}
            {(view === 'login' || view === 'admin-login') && <Login onLoginSuccess={handleLogin} onBack={() => setView('home')} isAdminLogin={view === 'admin-login'} />}
            {view === 'admin' && <Dashboard onLogout={logout} />}
        </div>
    )
}

export default App
