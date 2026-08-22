import { useEffect, useState } from 'react'

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'
const formatPrice = (price) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(price || 0)
const resolveImageUrl = (url) => {
    if (!url) return '/images/hero.png'
    if (url.startsWith('/static/')) return `${API_URL}${url}`
    return url
}

export const Footer = () => (
    <footer style={{ background: 'var(--footer-bg)', color: 'var(--footer-text)', padding: '5rem 0 2rem' }}>
        <div className="container" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4rem' }}>
            <div>
                <div style={{ fontSize: '1.75rem', fontWeight: '800', marginBottom: '1.5rem' }}>
                    NEO<span style={{ color: 'var(--primary)' }}>GEST</span>
                </div>
                <p style={{ color: 'var(--footer-muted)', fontSize: '0.9rem', lineHeight: 1.6 }}>
                    Redefiniendo el diseno de interiores en Colombia con muebles premium inspirados en la estetica minimalista y moderna.
                </p>
            </div>
            <div>
                <h4 style={{ marginBottom: '1.5rem' }}>Explorar</h4>
                <ul style={{ listStyle: 'none', color: 'var(--footer-muted)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <li><a href="#catalogo" style={{ color: 'inherit', textDecoration: 'none' }}>Catalogo Hogar</a></li>
                    <li><a href="#catalogo" style={{ color: 'inherit', textDecoration: 'none' }}>Catalogo Oficina</a></li>
                    <li><a href="#catalogo" style={{ color: 'inherit', textDecoration: 'none' }}>Nuevos Arrivos</a></li>
                    <li><a href="#catalogo" style={{ color: 'inherit', textDecoration: 'none' }}>Ofertas</a></li>
                </ul>
            </div>
            <div>
                <h4 style={{ marginBottom: '1.5rem' }}>Servicio al Cliente</h4>
                <ul style={{ listStyle: 'none', color: 'var(--footer-muted)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <li><a href="#" style={{ color: 'inherit', textDecoration: 'none' }}>Envios (Servientrega)</a></li>
                    <li><a href="#" style={{ color: 'inherit', textDecoration: 'none' }}>Terminos y Condiciones</a></li>
                    <li><a href="#" style={{ color: 'inherit', textDecoration: 'none' }}>Preguntas Frecuentes</a></li>
                    <li><a href="#" style={{ color: 'inherit', textDecoration: 'none' }}>Soporte Tecnico</a></li>
                </ul>
            </div>
            <div>
                <h4 style={{ marginBottom: '1.5rem' }}>Contacto</h4>
                <p style={{ color: 'var(--footer-muted)', fontSize: '0.9rem', marginBottom: '1rem' }}>Bogota, Colombia</p>
                <p style={{ color: 'var(--footer-muted)', fontSize: '0.9rem', marginBottom: '1rem' }}>+57 300 123 4567</p>
            </div>
        </div>
        <div className="container" style={{ marginTop: '4rem', paddingTop: '2rem', borderTop: '1px solid var(--footer-border)', textAlign: 'center', color: 'var(--footer-muted)', fontSize: '0.8rem' }}>
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
                            <img src={resolveImageUrl(item.producto.imagen_url)} alt={item.producto.nombre} style={{ width: '80px', height: '80px', borderRadius: '0.5rem', objectFit: 'cover' }} />
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
                        <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '1.5rem' }}>Se creara un pedido pendiente y se reservara el stock hasta que pagues o canceles.</p>
                        <button onClick={onCheckout} disabled={isCheckingOut} className="btn btn-primary" style={{ width: '100%', padding: '1.25rem' }}>
                            {isCheckingOut ? 'Creando pedido...' : 'Crear pedido y continuar al pago'}
                        </button>
                    </div>
                )}
            </div>
        </>
    )
}

const getOrderId = (order) => order?.id || order?.idPedido

const getOrderProductSummary = (order) => {
    const products = order?.items?.map((item) => item.producto).filter(Boolean) || []
    if (products.length === 0) {
        return {
            imageUrl: '/images/hero.png',
            label: 'Sin producto',
            fullLabel: 'Sin producto',
        }
    }

    const firstProduct = products[0]
    const names = products.map((product) => product.nombre).filter(Boolean)
    const extraCount = Math.max(products.length - 1, 0)

    return {
        imageUrl: resolveImageUrl(firstProduct.imagen_url),
        label: extraCount > 0 ? `${firstProduct.nombre} +${extraCount} productos` : firstProduct.nombre,
        fullLabel: names.join(', '),
    }
}

const getOrderStatusBadgeClass = (status) => {
    const statusClasses = {
        Pagado: 'badge-paid',
        Pendiente: 'badge-pending',
        Cancelado: 'badge-cancelled',
        Vencido: 'badge-expired',
    }
    return statusClasses[status] || 'badge-neutral'
}

const PaymentModal = ({ order, onClose, onSubmit, onCancelOrder, isPaying, isCanceling }) => {
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

    const handleCancelOrder = async () => {
        const cancelled = await onCancelOrder(order)
        if (cancelled) onClose()
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

                    <button type="submit" disabled={isPaying || isCanceling} className="btn btn-primary">
                        {isPaying ? 'Procesando...' : 'Confirmar pago'}
                    </button>
                    <button type="button" disabled={isPaying || isCanceling} className="table-action table-action-danger" onClick={handleCancelOrder}>
                        {isCanceling ? 'Cancelando pedido...' : 'Cancelar pedido y liberar stock'}
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

const TrackingPanel = ({ tracking }) => {
    if (!tracking) return null
    return (
        <div className="tracking-panel">
            <div>
                <span className="order-kicker">Rastreo</span>
                <h2>Pedido #{tracking.pedido_id}</h2>
                <p>{tracking.tiene_envio ? 'Pedido despachado' : tracking.mensaje}</p>
            </div>
            <div className="receipt-grid">
                <span>Estado pedido</span>
                <strong>{tracking.estado_pedido}</strong>
                <span>Estado envio</span>
                <strong>{tracking.estado || 'Sin despacho'}</strong>
                <span>Transportadora</span>
                <strong>{tracking.empresa_transporte || 'Pendiente'}</strong>
                <span>Codigo</span>
                <strong>{tracking.codigo_seguimiento || 'Pendiente'}</strong>
                <span>Despacho</span>
                <strong>{tracking.fecha_despacho ? new Date(tracking.fecha_despacho).toLocaleDateString('es-CO') : 'Pendiente'}</strong>
                <span>Entrega estimada</span>
                <strong>{tracking.fecha_entrega_estimada ? new Date(tracking.fecha_entrega_estimada).toLocaleDateString('es-CO') : 'Sin definir'}</strong>
            </div>
        </div>
    )
}

export const OrdersPanel = ({ lastOrder, orders, onPayOrder, onViewPayment, onTrackOrder, onCancelOrder, onDownloadInvoice, onSendInvoiceEmail, isPaying, cancelingOrderId, paymentResult, paymentPromptOrder, onPaymentPromptClose }) => {
    const [paymentOrder, setPaymentOrder] = useState(null)
    const [trackingResult, setTrackingResult] = useState(null)
    const [trackingOrderId, setTrackingOrderId] = useState(null)

    useEffect(() => {
        if (paymentPromptOrder) {
            setPaymentOrder(paymentPromptOrder)
        }
    }, [paymentPromptOrder])

    const closePaymentModal = () => {
        setPaymentOrder(null)
        if (onPaymentPromptClose) onPaymentPromptClose()
    }

    const handleTrackOrder = async (order) => {
        const orderId = getOrderId(order)
        setTrackingOrderId(orderId)
        const data = await onTrackOrder(order)
        if (data) setTrackingResult(data)
        setTrackingOrderId(null)
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
                            <div className="order-inline-actions">
                                <button type="button" className="btn btn-primary" onClick={() => setPaymentOrder(lastOrder)}>
                                    Pagar
                                </button>
                                <button type="button" className="table-action table-action-danger" onClick={() => onCancelOrder(lastOrder)} disabled={cancelingOrderId === getOrderId(lastOrder)}>
                                    {cancelingOrderId === getOrderId(lastOrder) ? 'Cancelando...' : 'Cancelar'}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            <PaymentReceipt payment={paymentResult} onDownloadInvoice={onDownloadInvoice} onSendInvoiceEmail={onSendInvoiceEmail} />
            <TrackingPanel tracking={trackingResult} />

            <div style={{ marginTop: '1.5rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '0.5rem', overflowX: 'auto' }}>
                <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)' }}>
                    <h2 style={{ fontSize: '1.1rem' }}>Mis pedidos recientes</h2>
                </div>
                <table className="premium-table orders-table">
                    <thead>
                        <tr>
                            <th>Pedido</th>
                            <th>Imagen</th>
                            <th>Producto</th>
                            <th>Estado</th>
                            <th>Total</th>
                            <th>Items</th>
                            <th>Accion</th>
                        </tr>
                    </thead>
                    <tbody>
                        {orders.map((order) => {
                            const productSummary = getOrderProductSummary(order)
                            return (
                                <tr key={order.id}>
                                    <td>#{order.id}</td>
                                    <td>
                                        <img className="order-product-thumb" src={productSummary.imageUrl} alt={productSummary.label} />
                                    </td>
                                    <td className="order-product-name" title={productSummary.fullLabel}>
                                        {productSummary.label}
                                    </td>
                                    <td><span className={`badge ${getOrderStatusBadgeClass(order.estado)}`}>{order.estado}</span></td>
                                    <td>{formatPrice(order.total_compra)}</td>
                                    <td>{order.items.length}</td>
                                    <td>
                                        {order.estado === 'Pendiente' && (
                                            <div className="order-inline-actions">
                                                <button type="button" className="table-action" onClick={() => setPaymentOrder(order)}>
                                                    Pagar
                                                </button>
                                                <button type="button" className="table-action table-action-danger" onClick={() => onCancelOrder(order)} disabled={cancelingOrderId === order.id}>
                                                    {cancelingOrderId === order.id ? 'Cancelando...' : 'Cancelar'}
                                                </button>
                                            </div>
                                        )}
                                        {order.estado === 'Pagado' && (
                                            <div className="order-inline-actions">
                                                <button type="button" className="table-action" onClick={() => onViewPayment(order)}>
                                                    Comprobante
                                                </button>
                                                <button type="button" className="table-action" onClick={() => handleTrackOrder(order)} disabled={trackingOrderId === order.id}>
                                                    {trackingOrderId === order.id ? 'Consultando...' : 'Rastrear'}
                                                </button>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            )
                        })}
                        {orders.length === 0 && (
                            <tr>
                                <td colSpan="7" style={{ textAlign: 'center', color: '#64748b' }}>Todavia no tienes pedidos.</td>
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
                    onCancelOrder={onCancelOrder}
                    isPaying={isPaying}
                    isCanceling={cancelingOrderId === getOrderId(paymentOrder)}
                />
            )}
        </section>
    )
}
