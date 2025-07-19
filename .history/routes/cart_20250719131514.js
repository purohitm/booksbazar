const express = require('express');
const router = express.Router();
const { Cart, Book, User, Order, OrderItem } = require('../config/db');
const auth = require('../middleware/auth');

// GET /cart - Display cart page
router.get('/', auth, async (req, res) => {
    try {
        const cartItems = await Cart.findAll({
            where: { userId: req.user.id },
            include: [{ model: Book, as: 'book' }]
        });

        const total = cartItems.reduce((sum, item) => {
            return sum + (item.book.price * item.quantity);
        }, 0);

        res.render('cart/index', {
            title: 'Shopping Cart',
            cartItems,
            total
        });
    } catch (error) {
        console.error('Error fetching cart:', error);
        req.flash('error', 'Error fetching cart items');
        res.redirect('/books');
    }
});

// POST /cart/:id/remove - Remove cart item
router.post('/:id/remove', auth, async (req, res) => {
    try {
        const cartItem = await Cart.findByPk(req.params.id);
        
        if (!cartItem || cartItem.userId !== req.user.id) {
            return res.redirect('/cart');
        }

        await cartItem.destroy();
        
        // Redirect back to cart
        res.redirect('/cart');
    } catch (error) {
        console.error('Error removing cart item:', error);
        req.flash('error', 'Error removing cart item');
        res.redirect('/cart');
    }
});

// POST /cart/:id/update - Update cart item quantity
router.post('/:id/update', auth, async (req, res) => {
    try {
        const cartItem = await Cart.findByPk(req.params.id);
        if (!cartItem || cartItem.userId !== req.user.id) {
            return res.redirect('/cart');
        }

        const quantity = parseInt(req.body.quantity);
        if (quantity < 1) {
            return res.redirect('/cart');
        }

        await cartItem.update({ quantity });
        res.redirect('/cart');
    } catch (error) {
        console.error('Error updating cart:', error);
        req.flash('error', 'Error updating cart item');
        res.redirect('/cart');
    }
});

// GET /cart/checkout - Show checkout form
router.get('/checkout', auth, async (req, res) => {
    try {
        const cartItems = await Cart.findAll({
            where: { userId: req.user.id },
            include: [{ model: Book, as: 'book' }]
        });
        const total = cartItems.reduce((sum, item) => sum + (item.book.price * item.quantity), 0);
        res.render('cart/checkout', {
            title: 'Checkout',
            cartItems,
            total,
            user: req.user
        });
    } catch (error) {
        console.error('Error loading checkout:', error);
        req.flash('error', 'Error loading checkout');
        res.redirect('/cart');
    }
});

// POST /cart/checkout - Process checkout and redirect to success page
router.post('/checkout', auth, async (req, res) => {
    try {
        const { address, phone, paymentMethod, cardName, cardNumber, expiry, cvv } = req.body;
        if (!address || !phone || !paymentMethod) {
            req.flash('error', 'All fields are required');
            return res.redirect('/cart/checkout');
        }
        // Get cart items
        const cartItems = await Cart.findAll({
            where: { userId: req.user.id },
            include: [{ model: Book, as: 'book' }]
        });
        if (!cartItems.length) {
            req.flash('error', 'Cart is empty');
            return res.redirect('/cart');
        }
        // Create order (fake payment)
        const order = await Order.create({
            userId: req.user.id,
            address,
            phone,
            paymentMethod,
            paymentStatus: 'Completed',
            total: cartItems.reduce((sum, item) => sum + (item.book.price * item.quantity), 0)
        });
        // Create order items
        await Promise.all(cartItems.map(async (item) => {
            await OrderItem.create({
                orderId: order.id,
                bookId: item.bookId,
                quantity: item.quantity,
                price: item.book.price
            });
        }));
        // Clear cart
        await Promise.all(cartItems.map(item => item.destroy()));
        // Redirect to success page
        res.redirect(`/cart/checkout-success/${order.id}`);
    } catch (error) {
        console.error('Error processing checkout:', error);
        req.flash('error', 'Error processing checkout');
        res.redirect('/cart/checkout');
    }
});

// GET /cart/checkout-success/:orderId - Show order summary and payment success
router.get('/checkout-success/:orderId', auth, async (req, res) => {
    try {
        const order = await Order.findOne({
            where: { id: req.params.orderId, userId: req.user.id },
            include: [{ model: OrderItem, as: 'items', include: [{ model: Book, as: 'book' }] }]
        });
        if (!order) {
            req.flash('error', 'Order not found');
            return res.redirect('/books');
        }
        res.render('cart/checkout-success', {
            title: 'Payment Successful',
            order,
            user: req.user
        });
    } catch (error) {
        console.error('Error loading order summary:', error);
        req.flash('error', 'Error loading order summary');
        res.redirect('/books');
    }
});

module.exports = router;
