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

    // Clean parallax scroll effects for hero sections (Home + About pages)
    if (!prefersReducedMotion) {
        // Select hero elements for both home and about pages
        const heroGlassCard = document.querySelector('.hero-glass-card');
        const heroSection = document.querySelector('.hero--home') || document.querySelector('.hero--about');
        const heroContent = document.querySelector('.hero-content');
        const heroDecorations = document.querySelector('.hero-decorations');
        const featureCards = document.querySelectorAll('.feature-card');
        const sections = document.querySelectorAll('.section');

        // Smooth lerp for buttery animations
        const lerp = (start, end, factor) => start + (end - start) * factor;

        // Animation state
        const state = {
            current: { cardY: 0, bgY: 0, opacity: 1 },
            target: { cardY: 0, bgY: 0, opacity: 1 }
        };

        let animating = false;
        let scrollTicking2 = false;

        // Easing function
        const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

        const animate = () => {
            // Smooth lerp all values
            state.current.cardY = lerp(state.current.cardY, state.target.cardY, 0.12);
            state.current.bgY = lerp(state.current.bgY, state.target.bgY, 0.08);
            state.current.opacity = lerp(state.current.opacity, state.target.opacity, 0.1);

            // Apply card transform - moves WITH the background parallax (clean look)
            if (heroGlassCard) {
                heroGlassCard.style.transform = `translateY(${state.current.cardY}px)`;
                heroGlassCard.style.opacity = state.current.opacity;
            }

            // Parallax background - moves slower than scroll for depth
            if (heroSection) {
                heroSection.style.backgroundPositionY = `${state.current.bgY}px`;
            }

            // Check if still animating
            const stillMoving = Math.abs(state.current.cardY - state.target.cardY) > 0.5 ||
                               Math.abs(state.current.opacity - state.target.opacity) > 0.01;

            if (stillMoving) {
                requestAnimationFrame(animate);
            } else {
                animating = false;
            }
        };

        const handleParallaxScroll = () => {
            const scrolled = window.scrollY;
            const windowHeight = window.innerHeight;

            if (heroGlassCard && heroSection) {
                // Calculate scroll progress
                const scrollProgress = Math.min(1, scrolled / (windowHeight * 0.8));
                const fadeProgress = easeOutCubic(Math.min(1, scrolled / (windowHeight * 0.5)));

                // Card moves up slower than scroll - creates parallax with background
                // This makes card and background feel connected and clean
                state.target.cardY = scrolled * 0.35;

                // Background moves even slower - creates depth
                state.target.bgY = scrolled * 0.5;

                // Smooth fade out as you scroll
                state.target.opacity = Math.max(0, 1 - fadeProgress * 1.2);
            }

            // Start animation loop if not running
            if (!animating) {
                animating = true;
                requestAnimationFrame(animate);
            }

            // Hero content fallback for other pages
            if (heroContent && !heroGlassCard && scrolled < windowHeight) {
                const parallaxSpeed = 0.5;
                const opacity = Math.max(0, 1 - scrolled / (windowHeight * 0.8));
                const translateY = scrolled * parallaxSpeed;

                heroContent.style.transform = `translateY(${translateY}px)`;
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
                const triggerPoint = windowHeight * 0.85;

                if (cardTop < triggerPoint && cardTop > -cardHeight) {
                    const progress = Math.min(1, Math.max(0, (triggerPoint - cardTop) / (windowHeight * 0.4)));
                    const delay = index * 0.08;
                    const adjustedProgress = Math.max(0, Math.min(1, (progress - delay) / (1 - delay)));

                    // Smooth easing
                    const eased = 1 - Math.pow(1 - adjustedProgress, 4);

                    const scale = 0.92 + (eased * 0.08);
                    const opacity = eased;
                    const translateY = (1 - eased) * 40;

                    card.style.transform = `translateY(${translateY}px) scale(${scale})`;
                    card.style.opacity = opacity;
                }
            });

            // Sections - smooth fade and slide with better timing
            sections.forEach((section) => {
                const rect = section.getBoundingClientRect();
                const sectionTop = rect.top;
                const sectionHeight = rect.height;
                const triggerPoint = windowHeight * 0.9;

                if (sectionTop < triggerPoint && sectionTop > -sectionHeight) {
                    const progress = Math.min(1, Math.max(0, (triggerPoint - sectionTop) / (windowHeight * 0.35)));
                    // Smooth ease out
                    const eased = 1 - Math.pow(1 - progress, 3);
                    const translateY = (1 - eased) * 30;

                    section.style.transform = `translateY(${translateY}px)`;
                    section.style.opacity = eased;
                }
            });
        };

        // Initial run
        handleParallaxScroll();

        // Smooth scroll handling with RAF
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

    // Contact page tab switching
    const contactTabs = document.querySelectorAll('.contact-tab');
    const contactTabContents = document.querySelectorAll('.contact-tab-content');

    contactTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const targetTab = tab.dataset.tab;

            // Remove active class from all tabs and contents
            contactTabs.forEach(t => t.classList.remove('active'));
            contactTabContents.forEach(content => content.classList.remove('active'));

            // Add active class to clicked tab and corresponding content
            tab.classList.add('active');
            const targetContent = document.querySelector(`[data-content="${targetTab}"]`);
            if (targetContent) {
                targetContent.classList.add('active');
            }
        });
    });

    // Handle contact forms (both patient and physician)
    const contactForms = document.querySelectorAll('.contact-form');
    contactForms.forEach(form => {
        const formId = form.id;
        const statusId = formId.replace('contact-form', 'form-status');
        const status = document.getElementById(statusId);
        const submitBtn = form.querySelector('button[type="submit"]');

        form.addEventListener('submit', (e) => {
            e.preventDefault();

            if (!form.checkValidity()) {
                if (status) {
                    status.textContent = 'Please complete all required fields.';
                    status.className = 'form-status error';
                }
                return;
            }

            if (submitBtn instanceof HTMLButtonElement) {
                submitBtn.disabled = true;
                const originalText = submitBtn.textContent;
                submitBtn.textContent = 'Sending...';

                if (status) {
                    status.textContent = '';
                    status.className = 'form-status';
                }

                window.setTimeout(() => {
                    form.reset();

                    if (status) {
                        status.textContent = 'Message sent! We\'ll get back to you soon.';
                        status.className = 'form-status success';
                    }

                    if (submitBtn instanceof HTMLButtonElement) {
                        submitBtn.disabled = false;
                        submitBtn.textContent = originalText;
                    }
                }, 800);
            }
        });
    });

    // Legacy contact form support (if exists)
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

    // Revenue Calculator
    const revenueCalculator = document.getElementById('revenue-calculator');
    const stepMa = document.getElementById('step-ma');
    const setMaFieldsEnabled = (enabled) => {
        if (!stepMa) return;
        stepMa
            .querySelectorAll('input[required], select[required], textarea[required]')
            .forEach((field) => {
                field.disabled = !enabled;
            });
    };

    // Keep hidden MA required fields from blocking Step 1 submission.
    if (stepMa) {
        const isVisible = stepMa.offsetParent !== null;
        setMaFieldsEnabled(isVisible);
    }
    if (revenueCalculator instanceof HTMLFormElement) {
        const revenueResults = document.getElementById('revenue-results');

        revenueCalculator.addEventListener('submit', (e) => {
            e.preventDefault();
            e.stopPropagation();

            // Get input
            const patientCountInput = document.getElementById('patient-count');
            if (!patientCountInput) {
                console.error('Patient count input not found');
                return;
            }

            const patientCount = parseInt(patientCountInput.value, 10);

            // Validate
            if (!patientCount || isNaN(patientCount) || patientCount < 1) {
                patientCountInput.focus();
                return;
            }

            // Calculate revenue
            const reimbursementPerPatient = 40;
            const monthlyRevenue = patientCount * reimbursementPerPatient;
            const annualRevenue = monthlyRevenue * 12;
            const totalMinutes = patientCount * 20;
            const totalHours = Math.round(totalMinutes / 60 * 10) / 10;

            // Update results
            const monthlyRevenueEl = document.getElementById('monthly-revenue');
            const annualRevenueEl = document.getElementById('annual-revenue');
            const totalHoursEl = document.getElementById('total-hours');

            if (monthlyRevenueEl) {
                monthlyRevenueEl.textContent = `$${monthlyRevenue.toLocaleString()}`;
            }
            if (annualRevenueEl) {
                annualRevenueEl.textContent = `$${annualRevenue.toLocaleString()}`;
            }
            if (totalHoursEl) {
                totalHoursEl.textContent = `${totalHours} hrs`;
            }

            // Show results with animation
            if (revenueResults) {
                revenueResults.style.display = 'block';
                revenueResults.style.opacity = '0';
                requestAnimationFrame(() => {
                    requestAnimationFrame(() => {
                        revenueResults.style.opacity = '1';
                    });
                });
            }

            // Auto-populate MA calculator if it exists
            const maRevenueInput = document.getElementById('monthly-revenue-input');
            if (maRevenueInput instanceof HTMLInputElement) {
                maRevenueInput.value = monthlyRevenue.toString();
            }
        });
    }

    // Continue to MA Calculator button
    const continueToMaBtn = document.getElementById('continue-to-ma');
    if (continueToMaBtn && stepMa) {
        continueToMaBtn.addEventListener('click', () => {
            stepMa.style.display = 'block';
            setMaFieldsEnabled(true);

            // Calculate suggested MA hours based on patient count
            const patientCountInput = document.getElementById('patient-count');
            const maHoursInput = document.getElementById('ma-hours');
            const suggestionBadge = document.getElementById('ma-hours-suggestion');
            const suggestionText = document.getElementById('ma-hours-suggestion-text');

            if (patientCountInput && maHoursInput) {
                const patientCount = parseInt(patientCountInput.value, 10);
                if (!isNaN(patientCount) && patientCount > 0) {
                    // Calculate total monthly hours: patients × 20 minutes / 60
                    const monthlyHours = (patientCount * 20) / 60;
                    // Convert to weekly hours: monthly / 4.33 weeks
                    const suggestedWeeklyHours = Math.round(monthlyHours / 4.33);

                    // Set the suggested value
                    maHoursInput.value = suggestedWeeklyHours.toString();

                    // Show and update the suggestion badge
                    if (suggestionBadge && suggestionText) {
                        suggestionText.textContent = `${suggestedWeeklyHours} hours suggested based on ${patientCount} patients (${Math.round(monthlyHours)} hrs/month)`;
                        suggestionBadge.style.display = 'inline-flex';
                    }
                }
            }

            setTimeout(() => {
                stepMa.style.opacity = '1';
                // Smooth scroll to MA section
                stepMa.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 10);
        });
    }

    // MA Staffing Calculator
    const calculateMaBtn = document.getElementById('calculate-ma-btn');
    if (calculateMaBtn) {
        calculateMaBtn.addEventListener('click', () => {
            const maResults = document.getElementById('ma-results');

            // Get input values
            const monthlyRevenueInput = document.getElementById('monthly-revenue-input');
            const minWageInput = document.getElementById('min-wage');
            const maHoursInput = document.getElementById('ma-hours');
            const additionalPatientsInput = document.getElementById('additional-patients');

            // Validate inputs
            if (!monthlyRevenueInput || !minWageInput || !maHoursInput || !additionalPatientsInput) {
                return;
            }

            const monthlyRevenue = parseFloat(monthlyRevenueInput.value);
            const hourlyWage = parseFloat(minWageInput.value);
            const weeklyHours = parseFloat(maHoursInput.value);
            const additionalPatients = parseInt(additionalPatientsInput.value, 10);

            if (isNaN(monthlyRevenue) || isNaN(hourlyWage) || isNaN(weeklyHours) || isNaN(additionalPatients)) {
                return;
            }

            // Calculate MA costs
            const weeksPerMonth = 4.33;
            const maMonthlyCost = hourlyWage * weeklyHours * weeksPerMonth;
            const maAnnualCost = maMonthlyCost * 12;

            // Calculate additional revenue from MA managing more patients
            const reimbursementPerPatient = 40;
            const additionalMonthlyRevenue = additionalPatients * reimbursementPerPatient;
            const additionalAnnualRevenue = additionalMonthlyRevenue * 12;

            // Calculate net benefit
            const netMonthlyBenefit = additionalMonthlyRevenue - maMonthlyCost;
            const netAnnualBenefit = additionalAnnualRevenue - maAnnualCost;

            // Calculate ROI percentage
            const roiPercentage = maMonthlyCost > 0 ? ((netMonthlyBenefit / maMonthlyCost) * 100) : 0;

            // Calculate break-even point
            const breakEvenPatients = Math.ceil(maMonthlyCost / reimbursementPerPatient);
            const breakEvenRevenue = breakEvenPatients * reimbursementPerPatient;

            // Update results
            const maMonthlyCostEl = document.getElementById('ma-monthly-cost');
            const maCostBreakdownEl = document.getElementById('ma-cost-breakdown');
            const additionalRevenueEl = document.getElementById('additional-revenue');
            const additionalRevenueBreakdownEl = document.getElementById('additional-revenue-breakdown');
            const netBenefitEl = document.getElementById('net-benefit');
            const roiPercentageEl = document.getElementById('roi-percentage');
            const maAnnualCostEl = document.getElementById('ma-annual-cost');
            const additionalAnnualRevenueEl = document.getElementById('additional-annual-revenue');
            const netAnnualBenefitEl = document.getElementById('net-annual-benefit');
            const breakEvenPatientsEl = document.getElementById('breakeven-patients');
            const breakEvenHintEl = document.getElementById('breakeven-hint');
            const breakEvenExplanationEl = document.getElementById('breakeven-explanation');

            if (maMonthlyCostEl) {
                maMonthlyCostEl.textContent = `$${Math.round(maMonthlyCost).toLocaleString()}`;
            }
            if (maCostBreakdownEl) {
                maCostBreakdownEl.textContent = `$${hourlyWage}/hr × ${weeklyHours} hrs/week`;
            }
            if (additionalRevenueEl) {
                additionalRevenueEl.textContent = `$${additionalMonthlyRevenue.toLocaleString()}`;
            }
            if (additionalRevenueBreakdownEl) {
                additionalRevenueBreakdownEl.textContent = `${additionalPatients} patients × $${reimbursementPerPatient}`;
            }
            if (netBenefitEl) {
                netBenefitEl.textContent = `$${Math.round(netMonthlyBenefit).toLocaleString()}`;
                // Color code based on positive/negative
                const resultCard = netBenefitEl.closest('.result-card');
                if (resultCard) {
                    if (netMonthlyBenefit >= 0) {
                        resultCard.classList.remove('result-negative');
                        resultCard.classList.add('result-positive');
                    } else {
                        resultCard.classList.remove('result-positive');
                        resultCard.classList.add('result-negative');
                    }
                }
            }
            if (roiPercentageEl) {
                const roiText = roiPercentage >= 0 ?
                    `${Math.round(roiPercentage)}% ROI` :
                    `${Math.round(Math.abs(roiPercentage))}% Loss`;
                roiPercentageEl.textContent = roiText;
            }
            if (maAnnualCostEl) {
                maAnnualCostEl.textContent = `$${Math.round(maAnnualCost).toLocaleString()}`;
            }
            if (additionalAnnualRevenueEl) {
                additionalAnnualRevenueEl.textContent = `$${additionalAnnualRevenue.toLocaleString()}`;
            }
            if (netAnnualBenefitEl) {
                netAnnualBenefitEl.textContent = `$${Math.round(netAnnualBenefit).toLocaleString()}`;
            }

            // Update break-even analysis
            if (breakEvenPatientsEl) {
                breakEvenPatientsEl.textContent = breakEvenPatients.toLocaleString();
            }
            if (breakEvenHintEl) {
                breakEvenHintEl.textContent = `${breakEvenPatients} patients × $${reimbursementPerPatient} = $${breakEvenRevenue.toLocaleString()}/month`;
            }
            if (breakEvenExplanationEl) {
                if (additionalPatients >= breakEvenPatients) {
                    const surplus = additionalPatients - breakEvenPatients;
                    breakEvenExplanationEl.innerHTML = `✓ With <strong>${additionalPatients} additional patients</strong>, you exceed the break-even point by <strong>${surplus} patients</strong>, generating a net profit of <strong>$${Math.round(netMonthlyBenefit).toLocaleString()}/month</strong>.`;
                    breakEvenExplanationEl.className = 'breakeven-explanation success';
                } else {
                    const shortfall = breakEvenPatients - additionalPatients;
                    breakEvenExplanationEl.innerHTML = `⚠ You need <strong>${shortfall} more patients</strong> to reach break-even. Currently, you would have a net loss of <strong>$${Math.round(Math.abs(netMonthlyBenefit)).toLocaleString()}/month</strong>.`;
                    breakEvenExplanationEl.className = 'breakeven-explanation warning';
                }
            }

            // Show results with animation
            if (maResults) {
                maResults.style.display = 'block';
                setTimeout(() => {
                    maResults.style.opacity = '1';
                }, 10);
            }
        });
    }
})();
