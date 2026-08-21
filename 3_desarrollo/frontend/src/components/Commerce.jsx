import React, { useEffect, useState } from 'react'

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
                        <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '1.5rem' }}>Se creara el pedido y se abrira el formulario de pago.</p>
                        <button onClick={onCheckout} disabled={isCheckingOut} className="btn btn-primary" style={{ width: '100%', padding: '1.25rem' }}>
                            {isCheckingOut ? 'Confirmando pedido...' : 'Confirmar pedido y pagar'}
                        </button>
                    </div>
                )}
            </div>
        </>
    )
}

const getOrderId = (order) => order?.id || order?.idPedido

const PaymentModal = ({ order, onClose, onSubmit, isPaying }) => {
    const [form, setForm] = useState({
        metodo: 'Tarjeta',
        ruc_nit_cliente: '',
        estado_transaccion: 'Aprobado',
    })
    const [error, setError] = useState(null)

    const updateField = (field, value) => setForm((current) => ({ ...current, [field]: value }))

    const handleSubmit = async (event) => {
        event.preventDefault()
        if (form.ruc_nit_cliente.trim().length < 5) {
            setError('Ingresa un RUC/NIT valido')
            return
        }
        setError(null)
        const result = await onSubmit(order, {
            ...form,
            ruc_nit_cliente: form.ruc_nit_cliente.trim(),
        })
        if (result?.ok) onClose()
    }

    return (
        <div className="modal-backdrop">
            <div className="payment-modal">
                <div className="payment-modal-header">
                    <div>
                        <span className="order-kicker">Pago de pedido</span>
                        <h2>Pedido #{getOrderId(order)}</h2>
                    </div>
                    <button type="button" onClick={onClose} disabled={isPaying} className="icon-close">x</button>
                </div>

                <div className="payment-summary">
                    <span>Total</span>
                    <strong>{formatPrice(order?.total_compra)}</strong>
                </div>

                <form onSubmit={handleSubmit} className="payment-form">
                    <label>
                        Metodo
                        <select value={form.metodo} onChange={(event) => updateField('metodo', event.target.value)}>
                            <option value="Tarjeta">Tarjeta</option>
                            <option value="PSE">PSE</option>
                            <option value="Transferencia">Transferencia</option>
                            <option value="Efectivo">Efectivo</option>
                        </select>
                    </label>

                    <label>
                        RUC/NIT
                        <input
                            type="text"
                            value={form.ruc_nit_cliente}
                            onChange={(event) => updateField('ruc_nit_cliente', event.target.value)}
                            placeholder="900123456-7"
                            maxLength={45}
                            required
                        />
                    </label>

                    <label>
                        Resultado
                        <select value={form.estado_transaccion} onChange={(event) => updateField('estado_transaccion', event.target.value)}>
                            <option value="Aprobado">Aprobado</option>
                            <option value="Rechazado">Rechazado</option>
                        </select>
                    </label>

                    {error && <div className="inline-message error">{error}</div>}

                    <button type="submit" disabled={isPaying} className="btn btn-primary">
                        {isPaying ? 'Procesando...' : 'Confirmar pago'}
                    </button>
                </form>
            </div>
        </div>
    )
}

const PaymentReceipt = ({ payment, onDownloadInvoice, onSendInvoiceEmail }) => {
    const [email, setEmail] = useState('')
    const [isSending, setIsSending] = useState(false)

    if (!payment) return null

    const handleSendEmail = async () => {
        setIsSending(true)
        await onSendInvoiceEmail(payment, email.trim())
        setIsSending(false)
    }

    return (
        <div className="payment-receipt">
            <div>
                <span className="order-kicker">Comprobante</span>
                <h2>Pedido #{payment.pedido_id}</h2>
                <p>Pago: {payment.estado_transaccion}</p>
                {payment.factura?.empresa_nombre && <p>{payment.factura.empresa_nombre}</p>}
                {payment.factura?.empresa_nit && <p>{payment.factura.empresa_nit}</p>}
            </div>
            <div className="receipt-grid">
                <span>Metodo</span>
                <strong>{payment.metodo}</strong>
                <span>Monto</span>
                <strong>{formatPrice(payment.monto)}</strong>
                <span>Factura</span>
                <strong>{payment.factura?.numero_factura || 'No generada'}</strong>
                <span>RUC/NIT</span>
                <strong>{payment.factura?.ruc_nit_cliente || 'No aplica'}</strong>
                <span>Cliente</span>
                <strong>{payment.factura?.cliente_nombre || 'No aplica'}</strong>
                <span>Direccion</span>
                <strong>{payment.factura?.cliente_direccion || 'No aplica'}</strong>
            </div>
            {payment.factura && (
                <div className="receipt-actions">
                    <button type="button" className="btn btn-primary" onClick={() => onDownloadInvoice(payment)}>
                        Descargar PDF
                    </button>
                    <div className="receipt-email">
                        <input
                            type="email"
                            value={email}
                            onChange={(event) => setEmail(event.target.value)}
                            placeholder="correo@ejemplo.com"
                        />
                        <button type="button" className="table-action" onClick={handleSendEmail} disabled={isSending}>
                            {isSending ? 'Enviando...' : 'Enviar por correo'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}

export const OrdersPanel = ({ lastOrder, orders, onPayOrder, onViewPayment, onDownloadInvoice, onSendInvoiceEmail, isPaying, paymentResult, paymentPromptOrder, onPaymentPromptClose }) => {
    const [paymentOrder, setPaymentOrder] = useState(null)

    useEffect(() => {
        if (paymentPromptOrder) {
            setPaymentOrder(paymentPromptOrder)
        }
    }, [paymentPromptOrder])

    const closePaymentModal = () => {
        setPaymentOrder(null)
        if (onPaymentPromptClose) onPaymentPromptClose()
    }

    if (!lastOrder && orders.length === 0) return null

    return (
        <section className="container" style={{ padding: '0 0 5rem' }}>
            {lastOrder && (
                <div className="order-success">
                    <div>
                        <span className="order-kicker">Pedido creado</span>
                        <h2>Pedido #{getOrderId(lastOrder)}</h2>
                        <p>Estado: {lastOrder.estado}</p>
                    </div>
                    <div className="order-actions">
                        <strong>{formatPrice(lastOrder.total_compra)}</strong>
                        {lastOrder.estado === 'Pendiente' && (
                            <button type="button" className="btn btn-primary" onClick={() => setPaymentOrder(lastOrder)}>
                                Pagar
                            </button>
                        )}
                    </div>
                </div>
            )}

            <PaymentReceipt payment={paymentResult} onDownloadInvoice={onDownloadInvoice} onSendInvoiceEmail={onSendInvoiceEmail} />

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
                            <th>Accion</th>
                        </tr>
                    </thead>
                    <tbody>
                        {orders.map((order) => (
                            <tr key={order.id}>
                                <td>#{order.id}</td>
                                <td><span className={`badge ${order.estado === 'Pagado' ? 'badge-paid' : 'badge-pending'}`}>{order.estado}</span></td>
                                <td>{formatPrice(order.total_compra)}</td>
                                <td>{order.items.length}</td>
                                <td>
                                    {order.estado === 'Pendiente' && (
                                        <button type="button" className="table-action" onClick={() => setPaymentOrder(order)}>
                                            Pagar
                                        </button>
                                    )}
                                    {order.estado === 'Pagado' && (
                                        <button type="button" className="table-action" onClick={() => onViewPayment(order)}>
                                            Comprobante
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                        {orders.length === 0 && (
                            <tr>
                                <td colSpan="5" style={{ textAlign: 'center', color: '#64748b' }}>Todavia no tienes pedidos.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
            {paymentOrder && (
                <PaymentModal
                    order={paymentOrder}
                    onClose={closePaymentModal}
                    onSubmit={onPayOrder}
                    isPaying={isPaying}
                />
            )}
        </section>
    )
}
