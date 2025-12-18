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
