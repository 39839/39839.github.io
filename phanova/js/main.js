(() => {
    const navbar = document.querySelector('.navbar');
    const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
    const navMenu = document.querySelector('.nav-menu');

    const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;

    const setMenuOpen = (open) => {
        if (!mobileMenuToggle || !navMenu) return;

        navMenu.classList.toggle('active', open);
        mobileMenuToggle.classList.toggle('active', open);
        document.body.classList.toggle('nav-open', open);

        mobileMenuToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
        mobileMenuToggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    };

    if (mobileMenuToggle && navMenu) {
        mobileMenuToggle.addEventListener('click', () => {
            setMenuOpen(!navMenu.classList.contains('active'));
        });

        navMenu.querySelectorAll('a').forEach((link) => {
            link.addEventListener('click', () => setMenuOpen(false));
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') setMenuOpen(false);
        });

        document.addEventListener('click', (e) => {
            if (!navMenu.classList.contains('active')) return;
            const target = e.target;
            if (!(target instanceof Element)) return;

            const clickedInsideNav = !!target.closest('.navbar');
            if (!clickedInsideNav) setMenuOpen(false);
        });
    }

    const updateNavbar = () => {
        if (!navbar) return;
        navbar.classList.toggle('scrolled', window.scrollY > 12);
    };

    updateNavbar();
    let scrollTicking = false;
    window.addEventListener(
        'scroll',
        () => {
            if (scrollTicking) return;
            scrollTicking = true;
            window.requestAnimationFrame(() => {
                updateNavbar();
                scrollTicking = false;
            });
        },
        { passive: true }
    );

    const normalizePath = (path) => {
        const withoutIndex = path.replace(/index\.html$/i, '');
        const trimmed = withoutIndex.replace(/\/$/, '');
        return trimmed === '' ? '/' : trimmed;
    };

    const currentPath = normalizePath(window.location.pathname);
    document.querySelectorAll('.nav-link').forEach((link) => {
        const linkPath = normalizePath(new URL(link.href).pathname);
        const isActive = linkPath === '/' ? currentPath === '/' : currentPath === linkPath || currentPath.startsWith(`${linkPath}/`);
        link.classList.toggle('active', isActive);
    });

    const revealElements = Array.from(document.querySelectorAll('.reveal'));
    if (revealElements.length) {
        const revealAll = () => revealElements.forEach((el) => el.classList.add('is-visible'));
        if (prefersReducedMotion || !('IntersectionObserver' in window)) {
            revealAll();
        } else {
            const observer = new IntersectionObserver(
                (entries, obs) => {
                    entries.forEach((entry) => {
                        if (!entry.isIntersecting) return;
                        entry.target.classList.add('is-visible');
                        obs.unobserve(entry.target);
                    });
                },
                { threshold: 0.12, rootMargin: '0px 0px -8% 0px' }
            );
            revealElements.forEach((el) => observer.observe(el));
        }
    }

    // Apple-style parallax and scroll effects
    if (!prefersReducedMotion) {
        const heroContent = document.querySelector('.hero-content');
        const heroDecorations = document.querySelector('.hero-decorations');
        const featureCards = document.querySelectorAll('.feature-card');
        const sections = document.querySelectorAll('.section');

        let scrollTicking2 = false;

        const handleParallaxScroll = () => {
            const scrolled = window.scrollY;
            const windowHeight = window.innerHeight;

            // Hero parallax - content moves slower than scroll
            if (heroContent && scrolled < windowHeight) {
                const parallaxSpeed = 0.5;
                const opacity = Math.max(0, 1 - scrolled / (windowHeight * 0.8));
                const translateY = scrolled * parallaxSpeed;
                const baseScale = 0.8; // Base scale from CSS
                const scrollScale = Math.max(0.95, 1 - scrolled / (windowHeight * 2));
                const finalScale = baseScale * scrollScale;

                heroContent.style.transform = `translateY(${translateY}px) scale(${finalScale})`;
                heroContent.style.opacity = opacity;
            }

            // Hero decorations - move faster for depth effect
            if (heroDecorations && scrolled < windowHeight) {
                const parallaxSpeed = 0.3;
                const translateY = scrolled * parallaxSpeed;
                heroDecorations.style.transform = `translateY(${translateY}px)`;
            }

            // Feature cards - staggered reveal with scale
            featureCards.forEach((card, index) => {
                const rect = card.getBoundingClientRect();
                const cardTop = rect.top;
                const cardHeight = rect.height;
                const triggerPoint = windowHeight * 0.75;

                if (cardTop < triggerPoint && cardTop > -cardHeight) {
                    const progress = Math.min(1, Math.max(0, (triggerPoint - cardTop) / (windowHeight * 0.5)));
                    const delay = index * 0.1;
                    const adjustedProgress = Math.max(0, progress - delay);

                    const scale = 0.9 + (adjustedProgress * 0.1);
                    const opacity = Math.min(1, adjustedProgress * 1.5);
                    const translateY = (1 - adjustedProgress) * 30;

                    card.style.transform = `translateY(${translateY}px) scale(${scale})`;
                    card.style.opacity = opacity;
                }
            });

            // Sections - smooth fade and slide
            sections.forEach((section) => {
                const rect = section.getBoundingClientRect();
                const sectionTop = rect.top;
                const sectionHeight = rect.height;
                const triggerPoint = windowHeight * 0.8;

                if (sectionTop < triggerPoint && sectionTop > -sectionHeight) {
                    const progress = Math.min(1, Math.max(0, (triggerPoint - sectionTop) / (windowHeight * 0.3)));
                    const translateY = (1 - progress) * 20;

                    section.style.transform = `translateY(${translateY}px)`;
                    section.style.opacity = Math.min(1, progress * 1.2);
                }
            });
        };

        // Initial run
        handleParallaxScroll();

        // Smooth scroll handling
        window.addEventListener('scroll', () => {
            if (scrollTicking2) return;
            scrollTicking2 = true;
            window.requestAnimationFrame(() => {
                handleParallaxScroll();
                scrollTicking2 = false;
            });
        }, { passive: true });

        // Smooth scroll for anchor links
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function(e) {
                const href = this.getAttribute('href');
                if (href === '#') return;

                const target = document.querySelector(href);
                if (target) {
                    e.preventDefault();
                    const targetPosition = target.getBoundingClientRect().top + window.scrollY - 80;
                    window.scrollTo({
                        top: targetPosition,
                        behavior: 'smooth'
                    });
                }
            });
        });
    }

    const contactForm = document.getElementById('contact-form');
    if (contactForm instanceof HTMLFormElement) {
        const status = document.getElementById('form-status');
        const submitBtn = contactForm.querySelector('button[type="submit"]');

        contactForm.addEventListener('submit', (e) => {
            e.preventDefault();

            if (!contactForm.checkValidity()) {
                if (status) {
                    status.textContent = 'Please complete all required fields.';
                    status.className = 'form-status error';
                }
                return;
            }

            if (submitBtn instanceof HTMLButtonElement) {
                submitBtn.disabled = true;
                submitBtn.textContent = 'Sending...';
            }

            if (status) {
                status.textContent = '';
                status.className = 'form-status';
            }

            window.setTimeout(() => {
                contactForm.reset();

                if (status) {
                    status.textContent = 'Message sent. We will get back to you soon.';
                    status.className = 'form-status success';
                }

                if (submitBtn instanceof HTMLButtonElement) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'Send';
                }
            }, 800);
        });
    }
})();
