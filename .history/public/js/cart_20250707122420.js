// Cart functionality
const Cart = {
    init() {
        this.setupEventListeners();
        this.setupToast();
    },

    setupEventListeners() {
        // Add to cart buttons
        document.querySelectorAll('.add-to-cart').forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                const bookId = button.dataset.bookId;
                const quantity = button.dataset.quantity || 1;
                this.addToCart(bookId, quantity);
            });
        });

        // Cart icon click
        document.querySelector('.cart-icon')?.addEventListener('click', () => {
            window.location.href = '/cart';
        });
    },

    async addToCart(bookId, quantity) {
        try {
            const response = await fetch(`/books/${bookId}/add-to-cart`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ quantity }),
            });

            const data = await response.json();

            if (data.success) {
                // Update cart count
                const cartCount = document.querySelector('.cart-count');
                if (cartCount) {
                    cartCount.textContent = data.cartItems.length;
                    this.animateCartIcon();
                }

                // Show success toast
                this.showSuccessToast(data);
            } else {
                this.showErrorToast(data.message);
            }
        } catch (error) {
            console.error('Error adding to cart:', error);
            this.showErrorToast('Failed to add item to cart. Please try again.');
        }
    },

    showSuccessToast(data) {
        const toast = document.createElement('div');
        toast.className = 'toast toast-success';
        
        // Find the book that was added
        const addedBook = data.cartItems.find(item => item.bookId === data.bookId);
        
        toast.innerHTML = `
            <div class="toast-content">
                <div class="toast-header">
                    <i class="fas fa-shopping-cart me-2"></i>
                    Item Added to Cart!
                </div>
                <div class="toast-body">
                    <div class="toast-item">
                        <img src="${addedBook?.book?.coverImage || '/images/default-book.png'}" alt="${addedBook?.book?.title || 'Book'}" class="toast-item-image">
                        <div class="toast-item-info">
                            <h6>${addedBook?.book?.title || 'Unknown Book'}</h6>
                            <p class="text-muted">${addedBook?.book?.price || 'Price not available'}</p>
                        </div>
                    </div>
                    <div class="toast-actions">
                        <button class="btn btn-sm btn-outline-primary" onclick="window.location.href='/cart'">Go to Cart</button>
                        <button class="btn btn-sm btn-outline-secondary" onclick="this.closest('.toast').remove()">Continue Shopping</button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(toast);
        setTimeout(() => {
            toast.remove();
        }, 3000);
    },

    showErrorToast(message) {
        const toast = document.createElement('div');
        toast.className = 'toast toast-error';
        toast.innerHTML = `
            <div class="toast-content">
                <div class="toast-header">
                    <i class="fas fa-exclamation-circle me-2"></i>
                    Error
                </div>
                <div class="toast-body">
                    <p>${message}</p>
                </div>
            </div>
        `;

        document.body.appendChild(toast);
        setTimeout(() => {
            toast.remove();
        }, 3000);
    },

    animateCartIcon() {
        const cartIcon = document.querySelector('.cart-icon');
        if (cartIcon) {
            cartIcon.classList.add('bounce');
            setTimeout(() => {
                cartIcon.classList.remove('bounce');
            }, 1000);
        }
    },

    setupToast() {
        // Add toast styles
        const style = document.createElement('style');
        style.textContent = `
            .toast {
                position: fixed;
                bottom: 20px;
                right: 20px;
                z-index: 1000;
                border-radius: 8px;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                animation: slideIn 0.3s ease-out;
                background: white;
                max-width: 300px;
                width: 90%;
            }

            .toast-success {
                border-left: 4px solid #4CAF50;
            }

            .toast-error {
                border-left: 4px solid #f44336;
            }

            .toast-content {
                padding: 1rem;
            }

            .toast-header {
                display: flex;
                align-items: center;
                color: #333;
                font-weight: 500;
                margin-bottom: 0.5rem;
            }

            .toast-body {
                color: #666;
            }

            .toast-item {
                display: flex;
                gap: 1rem;
                margin-bottom: 1rem;
            }

            .toast-item-image {
                width: 50px;
                height: 70px;
                object-fit: cover;
                border-radius: 4px;
            }

            .toast-item-info h6 {
                margin: 0;
                color: #333;
            }

            .toast-actions {
                display: flex;
                gap: 0.5rem;
            }

            .toast-actions button {
                flex: 1;
            }

            .cart-icon {
                position: relative;
            }

            .cart-count {
                position: absolute;
                top: -8px;
                right: -8px;
                background-color: #4CAF50;
                color: white;
                border-radius: 50%;
                padding: 0.25rem 0.5rem;
                font-size: 0.75rem;
                min-width: 1.5rem;
                text-align: center;
            }

            @keyframes slideIn {
                from {
                    transform: translateX(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }

            @keyframes bounce {
                0%, 20%, 50%, 80%, 100% {
                    transform: translateY(0);
                }
                40% {
                    transform: translateY(-30px);
                }
                60% {
                    transform: translateY(-15px);
                }
            }

            .bounce {
                animation: bounce 1s ease-in-out;
            }

            @media (max-width: 768px) {
                .toast {
                    width: 95%;
                }
            }
        `;
        document.head.appendChild(style);
    }
};

// Initialize cart when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    Cart.init();
});
