const express = require('express');
const router = express.Router();
const { Cart, Book, User } = require('../config/db');
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

// POST /cart/checkout - Process checkout
router.post('/checkout', auth, async (req, res) => {
    try {
        const { address, phone, paymentMethod } = req.body;

        if (!address || !phone || !paymentMethod) {
            return res.status(400).json({ 
                success: false, 
                message: 'All fields are required' 
            });
        }

        // Get cart items
        const cartItems = await Cart.findAll({
            where: { userId: req.user.id },
            include: [{ model: Book, as: 'book' }]
        });

        if (!cartItems.length) {
            return res.status(400).json({ 
                success: false, 
                message: 'Cart is empty' 
            });
        }

        // Create order
        const order = await Order.create({
            userId: req.user.id,
            address,
            phone,
            paymentMethod,
            status: 'pending',
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

        res.json({ 
            success: true, 
            message: 'Order placed successfully', 
            orderId: order.id 
        });
    } catch (error) {
        console.error('Error processing checkout:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error processing checkout' 
        });
    }
});

module.exports = router;
