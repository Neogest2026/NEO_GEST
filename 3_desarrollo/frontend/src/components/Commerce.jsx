import React from 'react'

const formatPrice = (price) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(price || 0)

export const Footer = () => (
    <footer style={{ background: 'var(--secondary)', color: 'white', padding: '5rem 0 2rem' }}>
        <div className="container" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4rem' }}>
            <div>
                <div style={{ fontSize: '1.75rem', fontWeight: '800', marginBottom: '1.5rem' }}>
                    NEO<span style={{ color: 'var(--primary)' }}>GEST</span>
                </div>
                <p style={{ color: '#94a3b8', fontSize: '0.9rem', lineHeight: 1.6 }}>
                    Redefiniendo el diseno de interiores en Colombia con muebles premium inspirados en la estetica minimalista y moderna.
                </p>
            </div>
            <div>
                <h4 style={{ marginBottom: '1.5rem' }}>Explorar</h4>
                <ul style={{ listStyle: 'none', color: '#94a3b8', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <li><a href="#catalogo" style={{ color: 'inherit', textDecoration: 'none' }}>Catalogo Hogar</a></li>
                    <li><a href="#catalogo" style={{ color: 'inherit', textDecoration: 'none' }}>Catalogo Oficina</a></li>
                    <li><a href="#catalogo" style={{ color: 'inherit', textDecoration: 'none' }}>Nuevos Arrivos</a></li>
                    <li><a href="#catalogo" style={{ color: 'inherit', textDecoration: 'none' }}>Ofertas</a></li>
                </ul>
            </div>
            <div>
                <h4 style={{ marginBottom: '1.5rem' }}>Servicio al Cliente</h4>
                <ul style={{ listStyle: 'none', color: '#94a3b8', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <li><a href="#" style={{ color: 'inherit', textDecoration: 'none' }}>Envios (Servientrega)</a></li>
                    <li><a href="#" style={{ color: 'inherit', textDecoration: 'none' }}>Terminos y Condiciones</a></li>
                    <li><a href="#" style={{ color: 'inherit', textDecoration: 'none' }}>Preguntas Frecuentes</a></li>
                    <li><a href="#" style={{ color: 'inherit', textDecoration: 'none' }}>Soporte Tecnico</a></li>
                </ul>
            </div>
            <div>
                <h4 style={{ marginBottom: '1.5rem' }}>Contacto</h4>
                <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '1rem' }}>Bogota, Colombia</p>
                <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '1rem' }}>+57 300 123 4567</p>
            </div>
        </div>
        <div className="container" style={{ marginTop: '4rem', paddingTop: '2rem', borderTop: '1px solid rgba(255,255,255,0.1)', textAlign: 'center', color: '#64748b', fontSize: '0.8rem' }}>
            (c) 2026 NEOGEST MODERNA. Todos los derechos reservados.
        </div>
    </footer>
)

export const CartDrawer = ({ isOpen, onClose, items, onRemove, onUpdateQuantity, onCheckout, isCheckingOut }) => {
    const total = items.reduce((acc, item) => acc + item.producto.precio_unitario * item.cantidad, 0)
    return (
        <>
            <div className={`cart-backdrop ${isOpen ? 'open' : ''}`} onClick={onClose}></div>
            <div className={`cart-drawer ${isOpen ? 'open' : ''}`} style={{ padding: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                    <h2 style={{ fontSize: '1.5rem' }}>Tu Carrito ({items.reduce((totalItems, item) => totalItems + item.cantidad, 0)})</h2>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}>x</button>
                </div>
                <div style={{ flex: 1, overflowY: 'auto' }}>
                    {items.map((item) => (
                        <div key={item.id} style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid #f1f5f9' }}>
                            <img src={item.producto.imagen_url || '/images/hero.png'} alt={item.producto.nombre} style={{ width: '80px', height: '80px', borderRadius: '0.5rem', objectFit: 'cover' }} />
                            <div style={{ flex: 1 }}>
                                <h4 style={{ fontSize: '0.9rem' }}>{item.producto.nombre}</h4>
                                <p style={{ fontWeight: 'bold' }}>{formatPrice(item.producto.precio_unitario)}</p>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <button onClick={() => onUpdateQuantity(item, item.cantidad - 1)} disabled={item.cantidad === 1 || isCheckingOut}>-</button>
                                    <span>{item.cantidad}</span>
                                    <button onClick={() => onUpdateQuantity(item, item.cantidad + 1)} disabled={item.cantidad >= item.producto.stock_actual || isCheckingOut}>+</button>
                                    <button onClick={() => onRemove(item.id)} disabled={isCheckingOut} style={{ color: '#ef4444', border: 'none', background: 'none', fontSize: '0.8rem', cursor: 'pointer', marginLeft: '0.5rem' }}>Eliminar</button>
                                </div>
                            </div>
                        </div>
                    ))}
                    {items.length === 0 && <p style={{ textAlign: 'center', marginTop: '4rem', color: '#64748b' }}>El carrito esta vacio</p>}
                </div>
                {items.length > 0 && (
                    <div style={{ paddingTop: '2rem', borderTop: '2px solid #f1f5f9' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                            <span style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>Total</span>
                            <span style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--primary-dark)' }}>{formatPrice(total)}</span>
                        </div>
                        <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '1.5rem' }}>El checkout genera un pedido en estado Pendiente.</p>
                        <button onClick={onCheckout} disabled={isCheckingOut} className="btn btn-primary" style={{ width: '100%', padding: '1.25rem' }}>
                            {isCheckingOut ? 'Confirmando pedido...' : 'Pagar Ahora (Checkout)'}
                        </button>
                    </div>
                )}
            </div>
        </>
    )
}

export const OrdersPanel = ({ lastOrder, orders }) => {
    if (!lastOrder && orders.length === 0) return null

    return (
        <section className="container" style={{ padding: '0 0 5rem' }}>
            {lastOrder && (
                <div className="order-success">
                    <div>
                        <span className="order-kicker">Pedido creado</span>
                        <h2>Pedido #{lastOrder.idPedido}</h2>
                        <p>Estado: {lastOrder.estado}</p>
                    </div>
                    <strong>{formatPrice(lastOrder.total_compra)}</strong>
                </div>
            )}

            <div style={{ marginTop: '1.5rem', background: '#fff', border: '1px solid #e5e7eb', borderRadius: '0.5rem', overflow: 'hidden' }}>
                <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #e5e7eb' }}>
                    <h2 style={{ fontSize: '1.1rem' }}>Mis pedidos recientes</h2>
                </div>
                <table className="premium-table">
                    <thead>
                        <tr>
                            <th>Pedido</th>
                            <th>Estado</th>
                            <th>Total</th>
                            <th>Items</th>
                        </tr>
                    </thead>
                    <tbody>
                        {orders.map((order) => (
                            <tr key={order.id}>
                                <td>#{order.id}</td>
                                <td><span className="badge badge-pending">{order.estado}</span></td>
                                <td>{formatPrice(order.total_compra)}</td>
                                <td>{order.items.length}</td>
                            </tr>
                        ))}
                        {orders.length === 0 && (
                            <tr>
                                <td colSpan="4" style={{ textAlign: 'center', color: '#64748b' }}>Todavia no tienes pedidos.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </section>
    )
}
