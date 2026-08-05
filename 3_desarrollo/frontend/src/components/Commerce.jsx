import React from 'react'
export const Footer = () => (
    <footer style={{ background: 'var(--secondary)', color: 'white', padding: '5rem 0 2rem' }}>
        <div className="container" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4rem' }}>
            <div>
                <div style={{ fontSize: '1.75rem', fontWeight: '800', marginBottom: '1.5rem' }}>
                    NEO<span style={{ color: 'var(--primary)' }}>GEST</span>
                </div>
                <p style={{ color: '#94a3b8', fontSize: '0.9rem', lineHeight: 1.6 }}>
                    Redefiniendo el diseño de interiores en Colombia con muebles premium inspirados en la estética minimalista y moderna.
                </p>
            </div>
            <div>
                <h4 style={{ marginBottom: '1.5rem' }}>Explorar</h4>
                <ul style={{ listStyle: 'none', color: '#94a3b8', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <li><a href="#" style={{ color: 'inherit', textDecoration: 'none' }}>Catálogo Hogar</a></li>
                    <li><a href="#" style={{ color: 'inherit', textDecoration: 'none' }}>Catálogo Oficina</a></li>
                    <li><a href="#" style={{ color: 'inherit', textDecoration: 'none' }}>Nuevos Arrivos</a></li>
                    <li><a href="#" style={{ color: 'inherit', textDecoration: 'none' }}>Ofertas</a></li>
                </ul>
            </div>
            <div>
                <h4 style={{ marginBottom: '1.5rem' }}>Servicio al Cliente</h4>
                <ul style={{ listStyle: 'none', color: '#94a3b8', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <li><a href="#" style={{ color: 'inherit', textDecoration: 'none' }}>Envíos (Servientrega)</a></li>
                    <li><a href="#" style={{ color: 'inherit', textDecoration: 'none' }}>Términos y Condiciones</a></li>
                    <li><a href="#" style={{ color: 'inherit', textDecoration: 'none' }}>Preguntas Frecuentes</a></li>
                    <li><a href="#" style={{ color: 'inherit', textDecoration: 'none' }}>Soporte Técnico</a></li>
                </ul>
            </div>
            <div>
                <h4 style={{ marginBottom: '1.5rem' }}>Contacto</h4>
                <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '1rem' }}>Bogotá, Colombia</p>
                <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '1rem' }}>+57 300 123 4567</p>
                <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                    <span>📸</span> <span>📘</span> <span>🐦</span>
                </div>
            </div>
        </div>
        <div className="container" style={{ marginTop: '4rem', paddingTop: '2rem', borderTop: '1px solid rgba(255,255,255,0.1)', textAlign: 'center', color: '#64748b', fontSize: '0.8rem' }}>
            © 2026 NEOGEST MODERNA. Todos los derechos reservados.
        </div>
    </footer>
)
export const CartDrawer = ({ isOpen, onClose, items, onRemove, onUpdateQuantity }) => {
    const total = items.reduce((acc, item) => acc + item.producto.precio_unitario * item.cantidad, 0)
    const formatPrice = (price) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(price)
    return (
        <>
            <div className={`cart-backdrop ${isOpen ? 'open' : ''}`} onClick={onClose}></div>
            <div className={`cart-drawer ${isOpen ? 'open' : ''}`} style={{ padding: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                    <h2 style={{ fontSize: '1.5rem' }}>Tu Carrito ({items.reduce((totalItems, item) => totalItems + item.cantidad, 0)})</h2>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}>✕</button>
                </div>
                <div style={{ flex: 1, overflowY: 'auto' }}>
                    {items.map((item) => (
                        <div key={item.id} style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid #f1f5f9' }}>
                            <img src={item.producto.imagen_url || '/images/hero.png'} alt={item.producto.nombre} style={{ width: '80px', height: '80px', borderRadius: '0.5rem', objectFit: 'cover' }} />
                            <div style={{ flex: 1 }}>
                                <h4 style={{ fontSize: '0.9rem' }}>{item.producto.nombre}</h4>
                                <p style={{ fontWeight: 'bold' }}>{formatPrice(item.producto.precio_unitario)}</p>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <button onClick={() => onUpdateQuantity(item, item.cantidad - 1)} disabled={item.cantidad === 1}>−</button>
                                    <span>{item.cantidad}</span>
                                    <button onClick={() => onUpdateQuantity(item, item.cantidad + 1)} disabled={item.cantidad >= item.producto.stock_actual}>+</button>
                                    <button onClick={() => onRemove(item.id)} style={{ color: '#ef4444', border: 'none', background: 'none', fontSize: '0.8rem', cursor: 'pointer', marginLeft: '0.5rem' }}>Eliminar</button>
                                </div>
                            </div>
                        </div>
                    ))}
                    {items.length === 0 && <p style={{ textAlign: 'center', marginTop: '4rem', color: '#64748b' }}>El carrito está vacío</p>}
                </div>
                {items.length > 0 && (
                    <div style={{ paddingTop: '2rem', borderTop: '2px solid #f1f5f9' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                            <span style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>Total</span>
                            <span style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--primary-dark)' }}>{formatPrice(total)}</span>
                        </div>
                        <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '1.5rem' }}>Métodos de pago aceptados:</p>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', marginBottom: '2rem' }}>
                            <div style={{ padding: '0.5rem', border: '1px solid #e2e8f0', borderRadius: '0.5rem', textAlign: 'center', fontSize: '0.7rem' }}>💳 PSE</div>
                            <div style={{ padding: '0.5rem', border: '1px solid #e2e8f0', borderRadius: '0.5rem', textAlign: 'center', fontSize: '0.7rem' }}>💰 Bancos</div>
                            <div style={{ padding: '0.5rem', border: '1px solid #e2e8f0', borderRadius: '0.5rem', textAlign: 'center', fontSize: '0.7rem' }}>🅿️ PayPal</div>
                            <div style={{ padding: '0.5rem', border: '1px solid #e2e8f0', borderRadius: '0.5rem', textAlign: 'center', fontSize: '0.7rem' }}>🚚 Servientrega</div>
                        </div>
                        <button className="btn btn-primary" style={{ width: '100%', padding: '1.25rem' }}>Pagar Ahora (Checkout)</button>
                    </div>
                )}
            </div>
        </>
    )
}
