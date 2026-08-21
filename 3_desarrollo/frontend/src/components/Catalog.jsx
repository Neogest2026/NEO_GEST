import { useEffect, useState } from 'react'

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'
const formatPrice = (price) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(price)

const Catalog = ({ searchTerm, addToCart, reloadKey = 0 }) => {
    const [products, setProducts] = useState([])
    const [categories, setCategories] = useState([])
    const [categoryId, setCategoryId] = useState('')
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [selectedProduct, setSelectedProduct] = useState(null)
    const [detailLoading, setDetailLoading] = useState(false)
    const [detailError, setDetailError] = useState('')

    useEffect(() => {
        fetch(`${API_URL}/api/v1/categorias`)
            .then((response) => response.ok ? response.json() : Promise.reject(new Error('No fue posible cargar las categorias')))
            .then(setCategories)
            .catch((loadError) => setError(loadError.message))
    }, [])

    useEffect(() => {
        const parameters = new URLSearchParams()
        if (searchTerm.trim()) parameters.set('q', searchTerm.trim())
        if (categoryId) parameters.set('categoria_id', categoryId)
        const query = parameters.toString()
        setLoading(true)
        setError('')
        fetch(`${API_URL}/api/v1/productos${query ? `?${query}` : ''}`)
            .then((response) => response.ok ? response.json() : Promise.reject(new Error('No fue posible cargar el catalogo')))
            .then(setProducts)
            .catch((loadError) => setError(loadError.message))
            .finally(() => setLoading(false))
    }, [searchTerm, categoryId, reloadKey])

    const openProductDetail = async (productId) => {
        setDetailLoading(true)
        setDetailError('')
        try {
            const response = await fetch(`${API_URL}/api/v1/productos/${productId}`)
            const data = await response.json()
            if (!response.ok) {
                setDetailError(data.detail || 'No fue posible cargar el producto')
                return
            }
            setSelectedProduct(data)
        } catch (loadError) {
            console.error(loadError)
            setDetailError('No fue posible cargar el producto')
        } finally {
            setDetailLoading(false)
        }
    }

    const closeProductDetail = () => {
        setSelectedProduct(null)
        setDetailError('')
    }

    return (
        <section id="catalogo" className="container" style={{ padding: '6rem 0' }}>
            <div className="section-header" style={{ textAlign: 'center', marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '3rem', fontWeight: 700, marginBottom: '1rem' }}>Coleccion Exclusiva</h2>
                <p style={{ color: 'var(--text-light)', fontSize: '1.2rem' }}>Piezas unicas disenadas para transformar ambientes</p>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '2rem' }}>
                <select value={categoryId} onChange={(event) => setCategoryId(event.target.value)} className="auth-input" style={{ minWidth: '220px' }} aria-label="Filtrar por categoria">
                    <option value="">Todas las categorias</option>
                    {categories.map((category) => <option key={category.id} value={category.id}>{category.nombre}</option>)}
                </select>
            </div>

            {loading && <p style={{ textAlign: 'center', padding: '4rem' }}>Cargando catalogo...</p>}
            {error && <p style={{ textAlign: 'center', padding: '2rem', color: '#dc2626' }}>{error}</p>}
            {detailLoading && <p style={{ textAlign: 'center', padding: '1rem' }}>Cargando detalle...</p>}
            {detailError && <p style={{ textAlign: 'center', padding: '1rem', color: '#dc2626' }}>{detailError}</p>}

            {!loading && !error && <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '2.5rem' }}>
                {products.map((product) => (
                    <article key={product.id} className="product-card">
                        <button onClick={() => openProductDetail(product.id)} style={{ border: 'none', background: 'transparent', width: '100%', padding: 0, cursor: 'pointer' }} aria-label={`Ver detalle de ${product.nombre}`}>
                            <div style={{ overflow: 'hidden', height: '300px' }}>
                                <img src={product.imagen_url || '/images/hero.png'} alt={product.nombre} style={{ width: '100%', height: '100%', objectFit: 'cover' }} className="product-image" />
                            </div>
                        </button>
                        <div style={{ padding: '1.5rem' }}>
                            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--primary-dark)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{product.categoria?.nombre || 'Sin categoria'}</span>
                            <h3 style={{ fontSize: '1.25rem', margin: '0.75rem 0' }}>{product.nombre}</h3>
                            {product.descripcion && <p style={{ color: 'var(--text-light)', minHeight: '2.8rem' }}>{product.descripcion}</p>}
                            <p style={{ color: 'var(--text-light)', fontSize: '0.9rem' }}><strong>Dimensiones:</strong> {product.dimensiones || 'No especificadas'}</p>
                            <p style={{ color: product.disponible ? '#15803d' : '#dc2626', fontSize: '0.9rem', fontWeight: 600 }}>{product.disponible ? `${product.stock_actual} disponibles` : 'Agotado'}</p>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                                <span style={{ fontSize: '1.5rem', fontWeight: 700 }}>{formatPrice(product.precio_unitario)}</span>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <button onClick={() => openProductDetail(product.id)} className="btn btn-outline" style={{ padding: '0.65rem 1rem' }}>Detalle</button>
                                    <button onClick={() => addToCart(product)} disabled={!product.disponible} className="btn btn-primary" style={{ opacity: product.disponible ? 1 : 0.55, cursor: product.disponible ? 'pointer' : 'not-allowed' }}>{product.disponible ? 'Agregar' : 'Agotado'}</button>
                                </div>
                            </div>
                        </div>
                    </article>
                ))}
            </div>}

            {!loading && !error && products.length === 0 && <div style={{ textAlign: 'center', padding: '4rem' }}><h3>No encontramos productos</h3><p>Prueba con otra categoria o termino de busqueda.</p></div>}

            {selectedProduct && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    background: 'rgba(15, 23, 42, 0.55)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 2100,
                    padding: '2rem'
                }}>
                    <div style={{ background: '#fff', width: 'min(920px, 100%)', borderRadius: '0.75rem', overflow: 'hidden', boxShadow: 'var(--shadow-lg)' }}>
                        <div className="product-detail-grid">
                            <img src={selectedProduct.imagen_url || '/images/hero.png'} alt={selectedProduct.nombre} style={{ width: '100%', height: '100%', minHeight: '420px', objectFit: 'cover' }} />
                            <div style={{ padding: '2rem', position: 'relative' }}>
                                <button onClick={closeProductDetail} style={{ position: 'absolute', top: '1rem', right: '1rem', border: 'none', background: '#f3f4f6', borderRadius: '999px', width: 36, height: 36, cursor: 'pointer' }}>x</button>
                                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--primary-dark)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{selectedProduct.categoria?.nombre || 'Sin categoria'}</span>
                                <h2 style={{ fontSize: '2rem', margin: '0.75rem 2rem 1rem 0', color: '#111827' }}>{selectedProduct.nombre}</h2>
                                <p style={{ color: '#4b5563', marginBottom: '1.25rem' }}>{selectedProduct.descripcion || 'Sin descripcion disponible.'}</p>
                                <div style={{ display: 'grid', gap: '0.75rem', marginBottom: '1.5rem' }}>
                                    <p><strong>Precio:</strong> {formatPrice(selectedProduct.precio_unitario)}</p>
                                    <p><strong>Dimensiones:</strong> {selectedProduct.dimensiones || 'No especificadas'}</p>
                                    <p><strong>Peso:</strong> {selectedProduct.peso ? `${selectedProduct.peso} kg` : 'No especificado'}</p>
                                    <p style={{ color: selectedProduct.disponible ? '#15803d' : '#dc2626', fontWeight: 700 }}>{selectedProduct.disponible ? `${selectedProduct.stock_actual} unidades disponibles` : 'Producto agotado'}</p>
                                </div>
                                <button onClick={() => addToCart(selectedProduct)} disabled={!selectedProduct.disponible} className="btn btn-primary" style={{ width: '100%', opacity: selectedProduct.disponible ? 1 : 0.55 }}>
                                    {selectedProduct.disponible ? 'Agregar al Carrito' : 'Agotado'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </section>
    )
}

export default Catalog
