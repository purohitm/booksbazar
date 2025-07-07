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

// POST /cart/:id/update - Update cart item quantity
router.post('/:id/update', auth, async (req, res) => {
    try {
        const cartItem = await Cart.findByPk(req.params.id);
        if (!cartItem || cartItem.userId !== req.user.id) {
            return res.status(404).json({ success: false, message: 'Cart item not found' });
        }

        const quantity = parseInt(req.body.quantity);
        if (quantity < 1) {
            return res.status(400).json({ success: false, message: 'Quantity must be at least 1' });
        }

        await cartItem.update({ quantity });
        res.json({ success: true, message: 'Quantity updated successfully' });
    } catch (error) {
        console.error('Error updating cart:', error);
        res.status(500).json({ success: false, message: 'Error updating cart item' });
    }
});

// POST /cart/:id/remove - Remove cart item
router.post('/:id/remove', auth, async (req, res) => {
    try {
        const cartItemId = req.params.id;
        const userId = req.user.id;

        console.log('Removing cart item:', { cartItemId, userId });

        // Find and delete the cart item
        const cartItem = await Cart.findOne({
            where: {
                id: cartItemId,
                userId
            }
        });

        if (!cartItem) {
            return res.status(404).json({ 
                success: false, 
                message: 'Cart item not found' 
            });
        }

        // Get cart item details before deletion
        const removedItem = {
            id: cartItem.id,
            bookId: cartItem.bookId,
            quantity: cartItem.quantity,
            book: await cartItem.getBook()
        };

        // Delete the cart item
        await cartItem.destroy();

        // Get updated cart items
        const cartItems = await Cart.findAll({
            where: { userId },
            include: [{ model: Book, as: 'book' }]
        });

        // Calculate total
        const total = cartItems.reduce((sum, item) => sum + (item.book.price * item.quantity), 0);

        res.json({ 
            success: true, 
            message: 'Item removed successfully',
            removedItem,
            cartItems,
            total
        });

    } catch (error) {
        console.error('Error removing cart item:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error removing cart item' 
        });
    }
});

// POST /cart/checkout - Process checkout
router.post('/checkout', auth, async (req, res) => {
    try {
        const { address, phone, paymentMethod } = req.body;

        if (!address || !phone || !paymentMethod) {
            return res.status(400).json({ success: false, message: 'All fields are required' });
        }

        // Get cart items
        const cartItems = await Cart.findAll({
            where: { userId: req.user.id },
            include: [{ model: Book, as: 'book' }]
        });

        if (!cartItems.length) {
            return res.status(400).json({ success: false, message: 'Cart is empty' });
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

        res.json({ success: true, message: 'Order placed successfully', orderId: order.id });
    } catch (error) {
        console.error('Error processing checkout:', error);
        res.status(500).json({ success: false, message: 'Error processing checkout' });
    }
});

module.exports = router;
