import React, { useEffect, useState } from 'react'

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'
const formatPrice = (price) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(price)

const Catalog = ({ searchTerm, addToCart }) => {
    const [products, setProducts] = useState([])
    const [categories, setCategories] = useState([])
    const [categoryId, setCategoryId] = useState('')
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    useEffect(() => {
        fetch(`${API_URL}/api/v1/categorias`)
            .then((response) => response.ok ? response.json() : Promise.reject(new Error('No fue posible cargar las categorías')))
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
            .then((response) => response.ok ? response.json() : Promise.reject(new Error('No fue posible cargar el catálogo')))
            .then(setProducts)
            .catch((loadError) => setError(loadError.message))
            .finally(() => setLoading(false))
    }, [searchTerm, categoryId])

    return (
        <section id="catalogo" className="container" style={{ padding: '6rem 0' }}>
            <div className="section-header" style={{ textAlign: 'center', marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '3rem', fontWeight: 700, marginBottom: '1rem' }}>Colección Exclusiva</h2>
                <p style={{ color: 'var(--text-light)', fontSize: '1.2rem' }}>Piezas únicas diseñadas para transformar ambientes</p>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '2rem' }}>
                <select value={categoryId} onChange={(event) => setCategoryId(event.target.value)} className="auth-input" style={{ minWidth: '220px' }} aria-label="Filtrar por categoría">
                    <option value="">Todas las categorías</option>
                    {categories.map((category) => <option key={category.id} value={category.id}>{category.nombre}</option>)}
                </select>
            </div>
            {loading && <p style={{ textAlign: 'center', padding: '4rem' }}>Cargando catálogo...</p>}
            {error && <p style={{ textAlign: 'center', padding: '2rem', color: '#dc2626' }}>{error}</p>}
            {!loading && !error && <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '2.5rem' }}>
                {products.map((product) => (
                    <article key={product.id} className="product-card">
                        <div style={{ overflow: 'hidden', height: '300px' }}><img src={product.imagen_url || '/images/hero.png'} alt={product.nombre} style={{ width: '100%', height: '100%', objectFit: 'cover' }} className="product-image" /></div>
                        <div style={{ padding: '1.5rem' }}>
                            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--primary-dark)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{product.categoria?.nombre || 'Sin categoría'}</span>
                            <h3 style={{ fontSize: '1.25rem', margin: '0.75rem 0' }}>{product.nombre}</h3>
                            {product.descripcion && <p style={{ color: 'var(--text-light)', minHeight: '2.8rem' }}>{product.descripcion}</p>}
                            <p style={{ color: 'var(--text-light)', fontSize: '0.9rem' }}><strong>Dimensiones:</strong> {product.dimensiones || 'No especificadas'}</p>
                            <p style={{ color: product.disponible ? '#15803d' : '#dc2626', fontSize: '0.9rem', fontWeight: 600 }}>{product.disponible ? `${product.stock_actual} disponibles` : 'Agotado'}</p>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
                                <span style={{ fontSize: '1.5rem', fontWeight: 700 }}>{formatPrice(product.precio_unitario)}</span>
                                <button onClick={() => addToCart(product)} disabled={!product.disponible} className="btn btn-primary" style={{ opacity: product.disponible ? 1 : 0.55, cursor: product.disponible ? 'pointer' : 'not-allowed' }}>{product.disponible ? 'Agregar' : 'Agotado'}</button>
                            </div>
                        </div>
                    </article>
                ))}
            </div>}
            {!loading && !error && products.length === 0 && <div style={{ textAlign: 'center', padding: '4rem' }}><h3>No encontramos productos</h3><p>Prueba con otra categoría o término de búsqueda.</p></div>}
        </section>
    )
}

export default Catalog
