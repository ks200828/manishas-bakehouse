"use strict";

const Utils = {
    announce: (message) => {
        const announcer = document.getElementById('a11y-announcer');
        if (announcer) announcer.textContent = message;
    },
    trapFocus: (element, event) => {
        const focusableEls = element.querySelectorAll('a[href], button, textarea, input');
        if (focusableEls.length === 0) return;
        const first = focusableEls[0];
        const last = focusableEls[focusableEls.length - 1];
        if (event.key === 'Tab') {
            if (event.shiftKey && document.activeElement === first) {
                last.focus(); event.preventDefault();
            } else if (!event.shiftKey && document.activeElement === last) {
                first.focus(); event.preventDefault();
            }
        }
    }
};

class LoaderManager {
    constructor() {
        this.loader = document.getElementById('page-loader');
        this.prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        this.init();
    }
    init() {
        if (!this.loader) return;
        const destroy = () => { if (this.loader && this.loader.parentNode) this.loader.parentNode.removeChild(this.loader); };
        const failsafe = setTimeout(destroy, 3500);

        if (typeof gsap !== 'undefined' && !this.prefersReducedMotion) {
            gsap.timeline({ onComplete: () => { clearTimeout(failsafe); destroy(); } })
                .to('.loader-text', { opacity: 1, duration: 0.5 })
                .to('.loader-text', { opacity: 0, duration: 0.5, delay: 0.2 })
                .to(this.loader, { y: "-100%", duration: 0.6, ease: "power3.inOut" })
                .fromTo(".gs-reveal", { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, stagger: 0.1 }, "-=0.2");
        } else {
            clearTimeout(failsafe); destroy();
        }
    }
}

class AnalyticsManager {
    constructor() {
        this.banner = document.getElementById('cookie-banner');
        this.init();
    }
    init() {
        const consent = localStorage.getItem('manishas_cookie_consent');
        if (!consent && this.banner) {
            setTimeout(() => {
                this.banner.classList.add('show');
                this.banner.setAttribute('aria-hidden', 'false');
                document.body.classList.add('cookie-visible');
            }, 1500);

            document.getElementById('btn-accept-cookies')?.addEventListener('click', () => this.setConsent('granted'));
            document.getElementById('btn-decline-cookies')?.addEventListener('click', () => this.setConsent('denied'));
        } else if (consent === 'granted') {
            this.updateGtag('granted');
        }
        
        document.body.addEventListener('click', (e) => {
            const trackEl = e.target.closest('[data-track]');
            if (trackEl && typeof gtag === 'function') {
                const eventName = trackEl.getAttribute('data-track');
                gtag('event', 'click', { 'event_category': 'interaction', 'event_label': eventName });
                if (eventName.includes('whatsapp') || eventName.includes('order')) {
                    gtag('event', 'generate_lead', { 'event_category': 'conversion', 'event_label': eventName });
                }
            }
        });
    }
    setConsent(status) {
        localStorage.setItem('manishas_cookie_consent', status);
        this.updateGtag(status);
        if (this.banner) {
            this.banner.classList.remove('show');
            this.banner.setAttribute('aria-hidden', 'true');
            document.body.classList.remove('cookie-visible');
        }
        Utils.announce(`Cookie preferences saved: ${status}`);
    }
    updateGtag(status) {
        if (typeof gtag === 'function') gtag('consent', 'update', { 'analytics_storage': status });
    }
}

class LanguageManager {
    constructor() {
        this.toggleBtn = document.getElementById('lang-toggle');
        this.currentLang = localStorage.getItem('manishas_lang') || 'en';
        this.dict = {
            'nav-story': { en: 'Our Story', hi: 'हमारी कहानी' },
            'nav-products': { en: 'Offerings', hi: 'उत्पाद' },
            'nav-gallery': { en: 'Gallery', hi: 'गैलरी' },
            'nav-contact': { en: 'Visit Us', hi: 'संपर्क करें' },
            'hero-subtitle': { en: 'Artisan Bakery', hi: 'कारीगर बेकरी' },
            'hero-btn': { en: 'View Collection', hi: 'संग्रह देखें' },
            'order-btn': { en: 'Order Now', hi: 'अभी ऑर्डर करें' },
            'story-title': { en: 'The Philosophy of Slow Baking', hi: 'धीमी बेकिंग का दर्शन' },
            'products-title': { en: 'Signature Offerings', hi: 'विशेष उत्पाद' },
            'gallery-title': { en: 'The Gallery', hi: 'गैलरी' },
            'contact-title': { en: 'Visit the Bakehouse', hi: 'बेकहाउस पधारें' }
        };
        this.init();
    }
    init() {
        if (!this.toggleBtn) return;
        this.applyLanguage(this.currentLang);
        this.toggleBtn.addEventListener('click', () => {
            this.currentLang = this.currentLang === 'en' ? 'hi' : 'en';
            localStorage.setItem('manishas_lang', this.currentLang);
            this.applyLanguage(this.currentLang);
        });
    }
    applyLanguage(lang) {
        this.toggleBtn.textContent = lang === 'en' ? 'हिन्दी' : 'English';
        document.documentElement.lang = lang;
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            if (this.dict[key]) el.textContent = this.dict[key][lang];
        });
    }
}

class UIManager {
    constructor() {
        this.initMenu();
        this.initLightbox();
        this.initScrollSpy();
    }
    initMenu() {
        const hamburger = document.getElementById('hamburger');
        const nav = document.getElementById('mobile-nav-wrapper');
        const links = document.querySelectorAll('.nav-item');
        if (!hamburger || !nav) return;

        const toggleMenu = (forceClose = false) => {
            const isOpen = hamburger.classList.contains('active');
            const willOpen = forceClose ? false : !isOpen;

            hamburger.classList.toggle('active', willOpen);
            nav.classList.toggle('active', willOpen);
            nav.setAttribute('aria-hidden', !willOpen);
            hamburger.setAttribute('aria-expanded', willOpen);
            
            if (willOpen) {
                document.body.style.overflow = 'hidden';
                setTimeout(() => nav.querySelector('a')?.focus(), 50);
            } else {
                document.body.style.overflow = '';
                hamburger.focus();
            }
        };

        hamburger.addEventListener('click', () => toggleMenu());
        links.forEach(l => l.addEventListener('click', () => toggleMenu(true)));

        nav.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') toggleMenu(true);
            Utils.trapFocus(nav, e);
        });
        
        let isScrolling = false;
        window.addEventListener('scroll', () => {
            if (!isScrolling) {
                window.requestAnimationFrame(() => {
                    document.getElementById('header').classList.toggle('scrolled', window.scrollY > 50);
                    isScrolling = false;
                });
                isScrolling = true;
            }
        }, { passive: true });
    }

    initScrollSpy() {
        const sections = document.querySelectorAll('section[id]');
        const links = document.querySelectorAll('.nav-item');

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if(entry.isIntersecting) {
                    links.forEach(link => {
                        const isMatch = link.getAttribute('href').substring(1) === entry.target.id;
                        link.classList.toggle('active', isMatch);
                        if(isMatch) link.setAttribute('aria-current', 'page');
                        else link.removeAttribute('aria-current');
                    });
                }
            });
        }, { rootMargin: "-40% 0px -60% 0px" });

        sections.forEach(s => observer.observe(s));
        
        if (typeof gsap !== 'undefined' && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            gsap.utils.toArray('.panel').forEach(panel => {
                gsap.from(panel, {
                    scrollTrigger: { trigger: panel, start: "top 85%" },
                    y: 30, opacity: 0, duration: 0.6, ease: "power2.out"
                });
            });
        }
    }

    initLightbox() {
        const lightbox = document.getElementById('lightbox');
        const img = document.getElementById('lightbox-img');
        const closeBtn = document.getElementById('close-lightbox');
        let triggerEl = null;

        if(!lightbox) return;

        const open = (src, alt, btn) => {
            triggerEl = btn;
            lightbox.style.display = 'flex';
            lightbox.setAttribute('aria-hidden', 'false');
            img.src = src;
            img.alt = alt;
            document.body.style.overflow = 'hidden';
            closeBtn.focus();
            Utils.announce(`Opened image: ${alt}`);
        };

        const close = () => {
            lightbox.style.display = 'none';
            lightbox.setAttribute('aria-hidden', 'true');
            img.src = '';
            document.body.style.overflow = '';
            if(triggerEl) triggerEl.focus();
        };

        document.querySelectorAll('.gallery-item-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const imageEl = btn.querySelector('img');
                open(imageEl.src, imageEl.alt, btn);
            });
        });

        closeBtn.addEventListener('click', close);
        lightbox.addEventListener('click', (e) => { if(e.target !== img) close(); });
        lightbox.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') close();
            if (e.key === 'Tab') { e.preventDefault(); closeBtn.focus(); } 
        });
    }
}

class FormManager {
    constructor() {
        this.form = document.getElementById('contact-form');
        this.status = document.getElementById('form-status');
        if (this.form) this.form.addEventListener('submit', (e) => this.submit(e));
    }
    updateStatus(msg, type) {
        if (!this.status) return;
        this.status.textContent = msg;
        this.status.className = `form-status ${type}`;
        this.status.style.display = 'block';
        Utils.announce(msg);
    }
    async submit(e) {
        e.preventDefault();
        if (this.form.elements['_honey']?.value !== "") return;
        if (!this.form.checkValidity()) {
            this.updateStatus("Please fill all fields correctly.", "error");
            this.form.reportValidity();
            return;
        }

        const btn = this.form.querySelector('button[type="submit"]');
        btn.disabled = true;
        this.updateStatus("Sending your message...", "");

        try {
            // Send the data to Formspree
            const response = await fetch('https://formspree.io/f/xbdapnny', {
                method: 'POST',
                body: new FormData(this.form),
                headers: { 'Accept': 'application/json' }
            });

            if (response.ok) {
                this.updateStatus("Thank you! We will get back to you shortly.", "success");
                this.form.reset();
                
                // GA4 Successful Form Submission Event
                if (typeof gtag === 'function') {
                    gtag('event', 'form_submit_success', { 
                        'event_category': 'engagement', 
                        'event_label': 'contact_form' 
                    });
                }
            } else {
                this.updateStatus("Oops! Something went wrong. Please use WhatsApp.", "error");
            }
            if (typeof gtag === 'function') gtag('event', 'form_submit_success', { 'event_category': 'engagement' });
        } catch (err) {
            this.updateStatus("Error sending message. Please contact via WhatsApp.", "error");
        } finally {
            btn.disabled = false;
        }
    }
}

document.addEventListener("DOMContentLoaded", () => {
    const yearSpan = document.getElementById('current-year');
    if(yearSpan) yearSpan.textContent = new Date().getFullYear();
    new LoaderManager();
    new AnalyticsManager();
    new LanguageManager();
    new UIManager();
    new FormManager();
});