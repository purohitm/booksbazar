const express = require('express');
const router = express.Router();
const { Order, OrderItem, Book, User } = require('../config/db');
const auth = require('../middleware/auth');

// GET /orders - Display user's orders
router.get('/', auth, async (req, res) => {
    try {
        const orders = await Order.findAll({
            where: { userId: req.user.id },
            include: [
                {
                    model: OrderItem,
                    as: 'items',
                    include: [{
                        model: Book,
                        as: 'book'
                    }]
                }
            ],
            order: [['createdAt', 'DESC']]
        });

        res.render('orders/index', {
            title: 'My Orders',
            orders
        });
    } catch (error) {
        console.error('Error fetching orders:', error);
        req.flash('error', 'Error fetching your orders');
        res.redirect('/cart');
    }
});

// GET /orders/:id - Display specific order details
router.get('/:id', auth, async (req, res) => {
    try {
        const order = await Order.findOne({
            where: {
                id: req.params.id,
                userId: req.user.id
            },
            include: [
                {
                    model: OrderItem,
                    as: 'items',
                    include: [{
                        model: Book,
                        as: 'book'
                    }]
                }
            ]
        });

        if (!order) {
            req.flash('error', 'Order not found');
            return res.redirect('/orders');
        }

        res.render('orders/details', {
            title: `Order #${order.id}`,
            order
        });
    } catch (error) {
        console.error('Error fetching order:', error);
        req.flash('error', 'Error fetching order details');
        res.redirect('/orders');
    }
});

module.exports = router;
