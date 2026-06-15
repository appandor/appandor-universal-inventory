// BACKEND SCREEN CONNECTION LOGIC
const API_URL = '/api';

// 1. Check Backend Health Status
async function checkStatus() {
    try {
        const response = await fetch(`${API_URL}/status`);
        const data = await response.json();
        if (data.status === 'online') {
            const statusBadge = document.getElementById('connection-status');
            statusBadge.textContent = `${data.authenticated_user} (${data.circle_id})`;
            statusBadge.style.background = '#14532d';
            statusBadge.style.color = '#4ade80';
        }
    } catch (error) {
        const statusBadge = document.getElementById('connection-status');
        statusBadge.textContent = 'Offline';
        statusBadge.style.background = '#7f1d1d';
        statusBadge.style.color = '#f87171';
    }
}

// 2. Fetch and Render All Products
async function loadProducts() {
    try {
        const response = await fetch(`${API_URL}/products`);
        const products = await response.json();
        const container = document.getElementById('products-container');
        container.innerHTML = '';

        if (products.length === 0) {
            container.innerHTML = '<p style="color: var(--text-muted); font-size: 14px;">No product templates created yet.</p>';
            return;
        }

        products.forEach(product => {
            const li = document.createElement('li');
            li.className = 'product-item';
            li.innerHTML = `
                <div class="product-info">
                    <h3>${product.name}</h3>
                    <p>Barcode: ${product.barcode || 'None'} | Min Stock: ${product.minimum_stock}</p>
                </div>
                <span class="badge">${product.category}</span>
            `;
            container.appendChild(li);
        });
    } catch (error) {
        console.error('Error loading products:', error);
    }
}

// 3. Handle Form Submission (Create Product)
document.getElementById('product-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const name = document.getElementById('name').value;
    const barcode = document.getElementById('barcode').value;
    const category = document.getElementById('category').value;
    const minimum_stock = parseInt(document.getElementById('minimum_stock').value, 10);

    try {
        const response = await fetch(`${API_URL}/products`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, barcode, category, minimum_stock })
        });

        if (response.ok) {
            document.getElementById('product-form').reset();
            document.getElementById('minimum_stock').value = '0';
            loadProducts(); // Refresh the list dynamically
        } else {
            const errData = await response.json();
            alert(`Error: ${errData.error}`);
        }
    } catch (error) {
        console.error('Error creating product:', error);
    }
});

// Initial Load when Page opens
checkStatus();
loadProducts();
