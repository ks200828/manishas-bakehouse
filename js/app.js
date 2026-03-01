const App = {
    data: null,
    cart: JSON.parse(localStorage.getItem('mb_cart')) || [],

    async init() {
        try {
            const response = await fetch('data.json?v=7.0');
            this.data = await response.json();
            this.updateCartBadge();
            this.route();
            this.initScrollAnimations();
        } catch (error) {
            console.error("Error loading database:", error);
        }
    },

    initScrollAnimations() {
        const header = document.querySelector('.header-fixed');
        window.addEventListener('scroll', () => {
            if (window.scrollY > 50) header.classList.add('scrolled');
            else header.classList.remove('scrolled');
        });

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('active');
                }
            });
        }, { threshold: 0.15 });

        setTimeout(() => {
            document.querySelectorAll('.reveal-up, .product-card').forEach(el => observer.observe(el));
        }, 100);
    },

    route() {
        const path = window.location.pathname;
        if (path.includes('product.html')) {
            this.renderProductDetail();
        } else if (path.includes('cart.html')) {
            this.renderCart();
        } else if (path.includes('shop.html')) {
            this.renderShop('shop-catalog-grid');
        } else {
            this.renderShop('home-menu-grid');
        }
    },

    renderShop(containerId) {
        if (containerId === 'home-menu-grid') {
            const cakesGrid = document.getElementById('cakes-grid');
            const cupcakesGrid = document.getElementById('cupcakes-grid');

            const renderHTML = (products) => products.map((p, index) => {
                const displayPrice = p.type === 'cake' ? p.weights[0].price : p.basePrice;
                const priceLabel = p.type === 'cake' ? 'onwards' : 'per piece (Min 6)';
                return `
                <a href="product.html?id=${p.id}" class="product-card" style="transition-delay: ${index * 0.1}s">
                    <div class="img-wrap"><img src="${p.image}" alt="${p.name}" loading="lazy"></div>
                    <div class="card-info">
                        <h3 class="product-title">${p.name}</h3>
                        <p class="product-price">${this.data.config.currencySymbol}${displayPrice} <span class="price-label">${priceLabel}</span></p>
                    </div>
                </a>
            `}).join('');

            if (cakesGrid) cakesGrid.innerHTML = renderHTML(this.data.products.filter(p => p.type === 'cake'));
            if (cupcakesGrid) cupcakesGrid.innerHTML = renderHTML(this.data.products.filter(p => p.type === 'cupcake'));
        } else {
            const grid = document.getElementById(containerId);
            if (!grid) return;
            grid.innerHTML = this.data.products.map((p, index) => {
                const displayPrice = p.type === 'cake' ? p.weights[0].price : p.basePrice;
                const priceLabel = p.type === 'cake' ? 'onwards' : 'per piece (Min 6)';
                return `
                <a href="product.html?id=${p.id}" class="product-card" style="transition-delay: ${index * 0.1}s">
                    <div class="img-wrap"><img src="${p.image}" alt="${p.name}" loading="lazy"></div>
                    <div class="card-info">
                        <h3 class="product-title">${p.name}</h3>
                        <p class="product-price">${this.data.config.currencySymbol}${displayPrice} <span class="price-label">${priceLabel}</span></p>
                    </div>
                </a>
            `}).join('');
        }
    },

    renderProductDetail() {
        const params = new URLSearchParams(window.location.search);
        const product = this.data.products.find(p => p.id === params.get('id'));
        if (!product) return window.location.href = 'shop.html';

        document.getElementById('p-image').src = product.image;
        document.getElementById('p-name').textContent = product.name;
        document.getElementById('p-desc').textContent = product.desc;

        document.getElementById('opt-types').innerHTML = this.data.options.types.map((t, i) => `
            <label class="radio-btn"><input type="radio" name="type" value="${t}" ${i===0?'checked':''}><span>${t}</span></label>
        `).join('');

        const weightSection = document.getElementById('weight-section');
        const cakeCustoms = document.getElementById('cake-customizations');
        
        if (product.type === 'cake') {
            document.getElementById('p-base-price').style.display = 'none';
            document.getElementById('opt-weights').innerHTML = product.weights.map((w, i) => `
                <label class="radio-btn"><input type="radio" name="weight" value="${w.label}" data-price="${w.price}" ${i===0?'checked':''}><span>${w.label} (${this.data.config.currencySymbol}${w.price})</span></label>
            `).join('');
            if (cakeCustoms) cakeCustoms.style.display = 'block'; 
        } else {
            weightSection.style.display = 'none';
            document.getElementById('p-base-price').textContent = `${this.data.config.currencySymbol}${product.basePrice} per piece`;
            if (cakeCustoms) cakeCustoms.style.display = 'none'; 
        }

        document.getElementById('opt-addons').innerHTML = product.allowedAddons.map(addonId => {
            const a = this.data.addonsDB[addonId];
            const addonPrice = product.type === 'cupcake' ? 5 : a.price;
            return `<label class="checkbox-btn"><input type="checkbox" name="addon" value="${a.label}" data-price="${addonPrice}"><span>${a.label} (+${this.data.config.currencySymbol}${addonPrice})</span></label>`;
        }).join('');

        const minQty = product.type === 'cupcake' ? product.minQty : 1;
        document.getElementById('qty-input').value = minQty;

        const form = document.getElementById('product-form');
        form.addEventListener('change', () => this.calculateLiveBill(product));
        document.getElementById('qty-minus').addEventListener('click', () => this.updateQty(-1, product, minQty));
        document.getElementById('qty-plus').addEventListener('click', () => this.updateQty(1, product, minQty));
        
        form.addEventListener('submit', (e) => { e.preventDefault(); this.addToCart(product, minQty); });
        this.calculateLiveBill(product);
    },

    updateQty(change, product, minQty) {
        const input = document.getElementById('qty-input');
        let val = parseInt(input.value) + change;
        if (val < minQty) {
            alert(`Premium requirement: Minimum order is ${minQty} pieces.`);
            val = minQty;
        }
        input.value = val;
        this.calculateLiveBill(product);
    },

    calculateLiveBill(product) {
        const form = document.getElementById('product-form');
        let baseItemPrice = product.type === 'cake' ? parseInt(form.querySelector('input[name="weight"]:checked')?.dataset.price || 0) : product.basePrice;
        
        let addonsPricePerItem = 0;
        form.querySelectorAll('input[name="addon"]:checked').forEach(cb => addonsPricePerItem += parseInt(cb.dataset.price));

        const qty = parseInt(document.getElementById('qty-input').value);
        const itemTotal = (baseItemPrice + addonsPricePerItem) * qty;

        document.getElementById('bill-cake').textContent = `${this.data.config.currencySymbol}${baseItemPrice}`;
        document.getElementById('bill-addons').textContent = `${this.data.config.currencySymbol}${addonsPricePerItem}`;
        document.getElementById('bill-total').textContent = `${this.data.config.currencySymbol}${itemTotal}`;
    },

    addToCart(product, minQty) {
        const qty = parseInt(document.getElementById('qty-input').value);
        if (qty < minQty) return alert(`Minimum quantity is ${minQty}.`);

        const form = document.getElementById('product-form');
        const type = form.querySelector('input[name="type"]:checked').value;
        const weightEl = form.querySelector('input[name="weight"]:checked');
        
        const baseItemPrice = product.type === 'cake' ? parseInt(weightEl.dataset.price) : product.basePrice;
        const weightLabel = product.type === 'cake' ? weightEl.value : "Standard Portion";
        
        let cakeMessage = "";
        let occasion = "None";
        if (product.type === 'cake') {
            cakeMessage = document.getElementById('cake-message').value.trim();
            occasion = form.querySelector('input[name="occasion"]:checked').value;
        }

        // Capture Special Instructions (works for both cakes and cupcakes)
        const specialInstructions = document.getElementById('special-instructions').value.trim();
        
        const addons = [];
        let addonsPricePerItem = 0;
        form.querySelectorAll('input[name="addon"]:checked').forEach(cb => {
            addons.push(cb.value);
            addonsPricePerItem += parseInt(cb.dataset.price);
        });

        this.cart.push({
            id: Date.now().toString(),
            name: product.name,
            productType: product.type,
            baseFormulation: type,
            weight: weightLabel,
            basePriceCombined: baseItemPrice,
            addons: addons,
            addonsPrice: addonsPricePerItem,
            cakeMessage: cakeMessage,
            occasion: occasion,
            specialInstructions: specialInstructions,
            qty: qty,
            total: (baseItemPrice + addonsPricePerItem) * qty,
            image: product.image
        });

        this.saveCart();
        window.location.href = 'cart.html';
    },

    renderCart() {
        const container = document.getElementById('cart-items');
        const summary = document.getElementById('cart-summary');
        if (this.cart.length === 0) {
            container.innerHTML = '<p style="text-align:center;">Your elegant bag is empty.</p>';
            summary.style.display = 'none';
            return;
        }

        let grandTotal = 0;
        container.innerHTML = this.cart.map((item, index) => {
            grandTotal += item.total;
            return `
            <div class="cart-item reveal-up" style="transition-delay: ${index * 0.1}s">
                <img src="${item.image}" alt="${item.name}">
                <div class="ci-details">
                    <h4>${item.name}</h4>
                    <p class="ci-meta">${item.baseFormulation} ${item.productType === 'cake' ? `| ${item.weight}` : ''}</p>
                    ${item.cakeMessage ? `<p class="ci-meta" style="color: var(--clr-cocoa); font-style: italic; margin-top: 0.2rem;">✍️ "${item.cakeMessage}"</p>` : ''}
                    ${item.occasion && item.occasion !== 'None' ? `<p class="ci-meta" style="color: var(--clr-gold); margin-top: 0.2rem;">🎉 Tag: ${item.occasion}</p>` : ''}
                    ${item.addons.length ? `<p class="ci-meta" style="margin-top: 0.2rem;">Extra Toppings: ${item.addons.join(', ')}</p>` : ''}
                    ${item.specialInstructions ? `<p class="ci-meta" style="color: #666; font-style: italic; margin-top: 0.2rem;">📝 Note: ${item.specialInstructions}</p>` : ''}
                    <p class="ci-price">${this.data.config.currencySymbol}${item.total} (Qty: ${item.qty})</p>
                </div>
                <button class="remove-btn" onclick="App.removeItem(${index})"><i class="fa-solid fa-xmark"></i></button>
            </div>
        `}).join('');

        summary.style.display = 'block';
        document.getElementById('cart-grand-total').textContent = `${this.data.config.currencySymbol}${grandTotal}`;
        document.getElementById('checkout-btn').onclick = () => this.checkoutWhatsApp(grandTotal);
    },

    removeItem(index) { this.cart.splice(index, 1); this.saveCart(); this.renderCart(); },
    saveCart() { localStorage.setItem('mb_cart', JSON.stringify(this.cart)); this.updateCartBadge(); },
    updateCartBadge() { document.querySelectorAll('.cart-badge').forEach(b => b.textContent = this.cart.length); },

    checkoutWhatsApp(grandTotal) {
        let msg = `Hello Manisha's Bakehouse 👋\n\nI would like to place an order:\n\n`;
        this.cart.forEach((item, i) => {
            msg += `*Item ${i + 1}:*\n🍰 Product: ${item.name}\n🍞 Base: ${item.baseFormulation}\n`;
            
            if (item.productType === 'cake') {
                msg += `⚖️ Weight: ${item.weight}\n`;
                if (item.cakeMessage) msg += `✍️ Message on Cake: "${item.cakeMessage}"\n`;
                if (item.occasion && item.occasion !== 'None') msg += `🎉 Occasion Tag: ${item.occasion}\n`;
            }
            
            if (item.addons.length) msg += `🥜 Extra Toppings:\n- ${item.addons.join('\n- ')}\n`;
            if (item.specialInstructions) msg += `📝 Special Instructions: ${item.specialInstructions}\n`;

            msg += `🔢 Quantity: ${item.qty}\n💰 Price Details:\n- Base Price: ${this.data.config.currencySymbol}${item.basePriceCombined}\n- Toppings: ${this.data.config.currencySymbol}${item.addonsPrice}\n----------------------\n`;
        });
        msg += `🧾 *Total Bill: ${this.data.config.currencySymbol}${grandTotal}*\n----------------------\n\nPlease confirm availability.\nThank you!`;
        window.open(`https://wa.me/${this.data.config.whatsappNumber}?text=${encodeURIComponent(msg)}`, '_blank');
    }
};

document.addEventListener('DOMContentLoaded', () => App.init());