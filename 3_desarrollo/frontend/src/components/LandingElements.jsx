import { useEffect, useState } from 'react'

const NAV_CATEGORIES = {
    hogar: [
        'Sala', 'Comedores', 'Lamparas', 'Mesas', 'Camas',
        'Sillones', 'Sofas', 'Sillas', 'Estantes', 'Cajones',
        'Nocheros', 'Repisas',
    ],
    oficina: [
        'Escritorios', 'Sillas', 'Lamparas', 'Repisas',
        'Puertas', 'Ventanas', 'Sofas',
    ],
}

const HERO_SLIDES = [
    {
        title: 'Diseno Minimalista para tu Hogar',
        desc: 'Explora la elegancia funcional de nuestra nueva coleccion NeoGest.',
        img: '/images/hero.png',
    },
    {
        title: 'Tu Oficina, Tu Santuario',
        desc: 'Eficiencia y confort en cada detalle con acabados premium.',
        img: '/images/comedor.png',
    },
    {
        title: 'Confort sin Limites',
        desc: 'Sofas y camas disenados para el descanso definitivo.',
        img: '/images/sofa.png',
    },
    {
        title: 'Detalles que Enamoran',
        desc: 'Lamparas y accesorios que transforman cualquier espacio.',
        img: '/images/lamp.png',
    },
]

const getDisplayName = (user) => {
    if (!user) return ''
    const rawName = user.name || user.email || ''
    const firstName = rawName.trim().split(/\s+/)[0]
    return firstName || rawName.split('@')[0] || 'Usuario'
}

export const Navbar = ({ onLoginClick, onRegisterClick, onSearch, cartItemsCount, onCartClick, currentUser, onLogout, theme, onToggleTheme }) => {
    const [isHomeOpen, setIsHomeOpen] = useState(false)
    const [isOfficeOpen, setIsOfficeOpen] = useState(false)

    return (
        <nav
            className="glass"
            style={{
                padding: '0.75rem 0',
                position: 'sticky',
                top: 0,
                zIndex: 1000,
                borderBottom: '1px solid var(--glass-border)',
            }}
        >
            <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '3rem' }}>
                    <div style={{ fontSize: '1.75rem', fontWeight: '800', letterSpacing: '-1px', color: 'var(--secondary)' }}>
                        NEO<span style={{ color: 'var(--primary-dark)' }}>GEST</span>
                    </div>
                    <ul style={{ display: 'flex', gap: '2rem', listStyle: 'none', alignItems: 'center' }}>
                        <li>
                            <a href="#inicio" className="menu-link" style={{ fontWeight: 600 }}>
                                Inicio
                            </a>
                        </li>
                        <li
                            className="nav-dropdown"
                            onMouseEnter={() => setIsHomeOpen(true)}
                            onMouseLeave={() => setIsHomeOpen(false)}
                        >
                            <a href="#catalogo" className="menu-link" style={{ fontWeight: 600 }}>
                                Hogar
                            </a>
                            <div
                                className="nav-dropdown-content"
                                style={{
                                    display: isHomeOpen ? 'grid' : 'none',
                                    gridTemplateColumns: 'repeat(2, 1fr)',
                                    width: '400px',
                                }}
                            >
                                {NAV_CATEGORIES.hogar.map((item) => (
                                    <a
                                        key={item}
                                        href={`#${item.toLowerCase()}`}
                                        className="menu-link"
                                        style={{ padding: '0.5rem' }}
                                    >
                                        {item}
                                    </a>
                                ))}
                            </div>
                        </li>
                        <li
                            className="nav-dropdown"
                            onMouseEnter={() => setIsOfficeOpen(true)}
                            onMouseLeave={() => setIsOfficeOpen(false)}
                        >
                            <a href="#catalogo" className="menu-link" style={{ fontWeight: 600 }}>
                                Oficina
                            </a>
                            <div
                                className="nav-dropdown-content"
                                style={{ display: isOfficeOpen ? 'grid' : 'none' }}
                            >
                                {NAV_CATEGORIES.oficina.map((item) => (
                                    <a
                                        key={item}
                                        href={`#${item.toLowerCase()}`}
                                        className="menu-link"
                                        style={{ padding: '0.5rem' }}
                                    >
                                        {item}
                                    </a>
                                ))}
                            </div>
                        </li>
                        <li><a href="#nosotros" className="menu-link" style={{ fontWeight: 600 }}>Nosotros</a></li>
                        <li><a href="#contacto" className="menu-link" style={{ fontWeight: 600 }}>Contacto</a></li>
                    </ul>
                </div>
                <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                    <div style={{ position: 'relative' }}>
                        <input
                            type="text"
                            placeholder="Buscar muebles..."
                            className="input-premium"
                            style={{ width: '200px', paddingRight: '2.5rem' }}
                            onChange={(event) => onSearch(event.target.value)}
                        />
                        <span
                            style={{
                                position: 'absolute',
                                right: '1rem',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                opacity: 0.5,
                            }}
                        >
                            {'\uD83D\uDD0D'}
                        </span>
                    </div>
                    <button
                        type="button"
                        className="theme-toggle"
                        onClick={onToggleTheme}
                        aria-label={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
                        title={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
                    >
                        <span>{theme === 'dark' ? '\u2600' : '\u263E'}</span>
                    </button>
                    <div
                        onClick={onCartClick}
                        style={{ position: 'relative', cursor: 'pointer', fontSize: '1.2rem' }}
                    >
                        {'\uD83D\uDED2'}
                        {cartItemsCount > 0 && (
                            <span
                                style={{
                                    position: 'absolute',
                                    top: '-8px',
                                    right: '-8px',
                                    background: 'var(--primary)',
                                    color: 'var(--secondary)',
                                    fontSize: '0.7rem',
                                    fontWeight: 'bold',
                                    padding: '2px 6px',
                                    borderRadius: '50%',
                                    border: '2px solid white',
                                }}
                            >
                                {cartItemsCount}
                            </span>
                        )}
                    </div>
                    {currentUser ? (
                        <div className="user-session">
                            <span>Bienvenido, <strong>{getDisplayName(currentUser)}</strong></span>
                            <button type="button" className="session-logout" onClick={onLogout}>
                                Salir
                            </button>
                        </div>
                    ) : (
                        <>
                            <button
                                onClick={onLoginClick}
                                className="btn btn-outline"
                                style={{ padding: '0.5rem 1.25rem' }}
                            >
                                Login
                            </button>
                            <button
                                onClick={onRegisterClick}
                                className="btn btn-primary"
                                style={{ padding: '0.5rem 1.25rem' }}
                            >
                                Unirse
                            </button>
                        </>
                    )}
                </div>
            </div>
        </nav>
    )
}

export const Hero = () => {
    const [currentSlide, setCurrentSlide] = useState(0)

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentSlide((current) => (current + 1) % HERO_SLIDES.length)
        }, 5000)
        return () => clearInterval(timer)
    }, [])

    return (
        <div className="container">
            <div className="slider-container animate-fade">
                {HERO_SLIDES.map((slide, index) => (
                    <div
                        key={slide.title}
                        className={`slide ${index === currentSlide ? 'active' : ''}`}
                    >
                        <div className="slide-overlay"></div>
                        <img
                            src={slide.img}
                            alt={slide.title}
                            className="slide-image"
                        />
                        <div
                            style={{
                                position: 'absolute',
                                left: '4rem',
                                zIndex: 2,
                                color: 'white',
                                maxWidth: '500px',
                            }}
                        >
                            <h1 style={{ fontSize: '4rem', marginBottom: '1rem', lineHeight: 1.1 }}>
                                {slide.title}
                            </h1>
                            <p style={{ fontSize: '1.25rem', opacity: 0.9, marginBottom: '2rem' }}>
                                {slide.desc}
                            </p>
                            <a href="#catalogo" className="btn btn-primary">
                                Ver Coleccion {'\u2192'}
                            </a>
                        </div>
                    </div>
                ))}
                <div className="slider-controls">
                    {HERO_SLIDES.map((slide, index) => (
                        <button
                            key={slide.title}
                            onClick={() => setCurrentSlide(index)}
                            style={{
                                width: '12px',
                                height: '12px',
                                borderRadius: '50%',
                                border: 'none',
                                background: index === currentSlide
                                    ? 'var(--primary)'
                                    : 'rgba(255,255,255,0.3)',
                                cursor: 'pointer',
                                transition: '0.3s',
                            }}
                            aria-label={`Ver slide ${index + 1}`}
                        />
                    ))}
                </div>
            </div>
        </div>
    )
}
