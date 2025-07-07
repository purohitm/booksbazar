const express = require('express');
const router = express.Router();
const axios = require('axios');
const { models } = require('../config/db');
const { Book, User, Cart, Saved, Payment, Order, OrderItem } = models;
const auth = require('../middleware/auth');

// GET /books - Display all books
router.get('/', async (req, res) => {
    try {
        // Fetch books from Google Books API
        const response = await axios.get('https://www.googleapis.com/books/v1/volumes', {
            params: {
                q: 'subject:fiction', // You can change this query to get different books
                maxResults: 12,
                orderBy: 'relevance'
            }
        });

        // Format books
        const books = (response?.data?.items || []).map(book => formatBook(book));

        res.render('books/index', {
            title: 'All Books',
            books,
            user: req.user
        });
    } catch (error) {
        console.error('Error fetching books:', error);
        res.render('error', {
            message: 'Error fetching books'
        });
    }
});

// GET /books - Browse all books
router.get('/browse', async (req, res) => {
    try {
        const books = await Book.findAll({
            order: [['createdAt', 'DESC']]
        });
        res.render('books/browse', {
            title: 'Browse Books',
            books
        });
    } catch (error) {
        res.status(500).render('error', { message: 'Error fetching books' });
    }
});

// Sell Book Form
router.get('/sell', auth, (req, res) => {
    res.render('books/sell', {
        title: 'Sell Your Book'
    });
});

// Get book image from Unsplash
async function getBookImage(title, author) {
    try {
        // Extract keywords from title and author
        const keywords = (title + ' ' + author)
            .toLowerCase()
            .replace(/[^\w\s]/g, '')
            .split(' ')
            .filter(word => word.length > 2)
            .join('+');

        // Fetch image from Unsplash
        const response = await axios.get(`https://api.unsplash.com/search/photos`, {
            params: {
                query: keywords,
                client_id: process.env.UNSPLASH_ACCESS_KEY,
                per_page: 1
            }
        });

        // Return the first image if found
        if (response.data && response.data.results && response.data.results[0]) {
            return response.data.results[0].urls.small;
        }
        return null;
    } catch (error) {
        console.error('Error fetching book image:', error);
        return null;
    }
}

// Handle Sell Book Submission
router.post('/sell', auth, async (req, res) => {
    try {
        const user = req.user;
        const { title, author, description, price, condition } = req.body;

        // Validate input
        if (!title || !author || !description || !price || !condition) {
            return res.status(400).render('books/sell', {
                title: 'Sell Your Book',
                error: 'All fields are required'
            });
        }

        // Generate a unique ID (you might want to use a more robust method)
        const bookId = `user_${user.id}_${Date.now()}`;

        // Try to get a relevant image
        const coverImage = await getBookImage(title, author);

        // Create the book
        const book = await Book.create({
            id: bookId,
            title,
            author,
            description,
            price: parseFloat(price),
            condition,
            userId: user.id,
            coverImage: coverImage || '/images/default-book.png' // You might want to add image upload functionality
        });

        res.redirect('/books');
    } catch (error) {
        console.error('Error selling book:', error);
        res.status(500).render('error', {
            message: 'Error selling book'
        });
    }
});

// GET book detail
router.get('/:id', async (req, res) => {
    try {
        const bookId = req.params.id;
        
        // Get book with all details
        const book = await Book.findByPk(bookId, {
            include: [
                {
                    model: User,
                    attributes: ['id', 'username', 'email']
                }
            ]
        });

        if (!book) {
            return res.status(404).render('error', {
                title: 'Book Not Found',
                message: 'The requested book does not exist'
            });
        }

        res.render('books/detail', {
            title: book.title,
            book,
            user: req.user
        });
    } catch (error) {
        console.error('Error fetching book details:', error);
        res.status(500).render('error', {
            message: 'Error fetching book details'
        });
    }
});

// Category route
router.get('/category/:category', async (req, res) => {
    try {
        const { category } = req.params;
        const { sort = 'relevance', minPrice, maxPrice, condition } = req.query;

        // Map category slugs to Google Books subjects
        const categoryMap = {
            fiction: 'subject:fiction',
            'non-fiction': 'subject:nonfiction',
            academic: 'subject:academic',
            science: 'subject:science',
            history: 'subject:history'
        };

        // Get category info
        const categories = [
            {
                name: 'Fiction',
                description: 'Explore the world of imagination',
                slug: 'fiction'
            },
            {
                name: 'Non-Fiction',
                description: 'Learn and discover new knowledge',
                slug: 'non-fiction'
            },
            {
                name: 'Academic',
                description: 'Educational and reference materials',
                slug: 'academic'
            },
            {
                name: 'Science',
                description: 'Explore the mysteries of science',
                slug: 'science'
            },
            {
                name: 'History',
                description: 'Discover the past',
                slug: 'history'
            }
        ];

        const categoryInfo = categories.find(c => c.slug === category);
        if (!categoryInfo) {
            return res.status(404).render('error', {
                title: 'Category Not Found',
                message: 'The requested category does not exist'
            });
        }

        // Build query parameters
        const queryParams = {
            q: categoryMap[category],
            orderBy: sort,
            maxResults: 20
        };

        // Add price filters if provided
        if (minPrice) queryParams.minPrice = minPrice;
        if (maxPrice) queryParams.maxPrice = maxPrice;

        // Fetch books from Google Books API
        const response = await axios.get('https://www.googleapis.com/books/v1/volumes', {
            params: queryParams
        }).catch(() => ({ data: { items: [] } }));

        // Format the books
        const books = (response?.data?.items || []).map(book => formatBook(book));

        res.render('books/category', {
            title: `${categoryInfo.name} Books`,
            categoryName: categoryInfo.name,
            categoryDescription: categoryInfo.description,
            books,
            user: req.user
        });
    } catch (error) {
        console.error('Error loading category:', error);
        res.render('error', {
            title: 'Error',
            message: 'Error loading books for this category'
        });
    }
});

// Add to Cart
router.post('/:bookId/add-to-cart', auth, async (req, res) => {
    try {
        const user = req.user;
        const bookId = req.params.bookId;
        const quantity = parseInt(req.body.quantity) || 1;

        console.log('Adding to cart:', { userId: user.id, bookId, quantity });

        // First check if the book exists in our database
        let book = await Book.findByPk(bookId);
        
        if (!book) {
            console.log('Book not found in database, fetching from Google Books API');
            try {
                const response = await axios.get('https://www.googleapis.com/books/v1/volumes', {
                    params: {
                        id: bookId
                    }
                });
                
                if (response.data && response.data.items && response.data.items[0]) {
                    const bookData = response.data.items[0];
                    console.log('Book data from API:', bookData);
                    
                    // Format the book data
                    const formattedBook = formatBook(bookData);
                    console.log('Formatted book:', formattedBook);
                    
                    // Save the book
                    book = await Book.create(formattedBook);
                    console.log('Book saved:', book);
                } else {
                    console.error('No book data returned from API');
                    return res.status(404).json({ message: 'Book not found in Google Books API' });
                }
            } catch (apiError) {
                console.error('Error fetching book from Google Books API:', apiError);
                return res.status(500).json({ message: 'Error fetching book data' });
            }
        }

        console.log('Book found:', book);

        // Now handle cart logic
        let cartItem = await Cart.findOne({
            where: {
                userId: user.id,
                bookId: book.id
            }
        });

        if (cartItem) {
            // Update existing quantity
            cartItem.quantity += quantity;
            await cartItem.save();
            console.log('Updated cart item:', cartItem);
        } else {
            // Create new cart item
            cartItem = await Cart.create({
                userId: user.id,
                bookId: book.id,
                quantity: quantity
            });
            console.log('Created new cart item:', cartItem);
        }

        // Get updated cart items with book details
        const cartItems = await Cart.findAll({
            where: { userId: user.id },
            include: [{
                model: Book,
                attributes: ['id', 'title', 'author', 'price', 'coverImage', 'description', 'publisher', 'publishedDate', 'isbn', 'pageCount', 'categories', 'rating', 'ratingCount', 'previewLink']
            }]
        });

        console.log('Cart items:', cartItems);

        // Calculate total amount
        const totalAmount = cartItems.reduce((sum, item) => sum + (item.Book.price * item.quantity), 0);

        res.json({
            success: true,
            message: 'Item added to cart successfully',
            cartItems,
            totalAmount
        });
    } catch (error) {
        console.error('Error adding to cart:', error);
        res.status(500).json({
            success: false,
            message: 'Error adding item to cart'
        });
    }
});

// Save for Later route
router.post('/:id/save', auth, async (req, res) => {
    try {
        const { id } = req.params;
        const user = req.user;

        // Check if book is already saved
        const existingSaved = await Saved.findOne({
            where: {
                userId: user.id,
                bookId: id
            }
        });

        if (existingSaved) {
            return res.status(400).json({
                message: 'Book is already saved for later'
            });
        }

        // Save book
        await Saved.create({
            userId: user.id,
            bookId: id
        });

        res.json({
            message: 'Book saved for later successfully'
        });
    } catch (error) {
        console.error('Error saving book:', error);
        res.status(500).json({
            message: 'Error saving book'
        });
    }
});

// Mock Payment route
router.post('/:id/buy', auth, async (req, res) => {
    try {
        const { id } = req.params;
        const user = req.user;
        const { quantity } = req.body;

        // Get the book
        const book = await Book.findByPk(id);
        if (!book) {
            return res.status(404).json({
                message: 'Book not found'
            });
        }

        // Create a mock payment
        const payment = await Payment.create({
            userId: user.id,
            bookId: id,
            amount: book.price * (quantity || 1),
            status: 'completed',
            paymentMethod: 'mock',
            transactionId: `MOCK-${Date.now()}`
        });

        // Create order
        const order = await Order.create({
            userId: user.id,
            paymentId: payment.id,
            status: 'completed',
            totalAmount: payment.amount
        });

        // Create order item
        await OrderItem.create({
            orderId: order.id,
            bookId: id,
            quantity: quantity || 1,
            price: book.price
        });

        // Remove from cart if it exists
        await Cart.destroy({
            where: {
                userId: user.id,
                bookId: id
            }
        });

        res.json({
            message: 'Payment successful',
            orderId: order.id,
            transactionId: payment.transactionId,
            totalAmount: payment.amount
        });
    } catch (error) {
        console.error('Error processing payment:', error);
        res.status(500).json({
            message: 'Error processing payment'
        });
    }
});

// Get Cart Page
router.get('/cart', auth, async (req, res) => {
    try {
        const user = req.user;
        console.log('Fetching cart for user:', user.id);
        
        // Get cart items with book details
        const cartItems = await Cart.findAll({
            where: { userId: user.id },
            include: [{
                model: Book,
                attributes: ['id', 'title', 'author', 'price', 'coverImage', 'description', 'publisher', 'publishedDate', 'isbn', 'pageCount', 'categories', 'rating', 'ratingCount', 'previewLink']
            }]
        });

        console.log('Cart items found:', cartItems.length);
        console.log('Sample cart item:', cartItems[0]);

        // Get purchase history
        const purchases = await Order.findAll({
            where: { userId: user.id },
            include: [{
                model: OrderItem,
                include: [{
                    model: Book,
                    attributes: ['id', 'title', 'author', 'price', 'coverImage', 'description', 'publisher', 'publishedDate', 'isbn', 'pageCount', 'categories', 'rating', 'ratingCount', 'previewLink']
                }]
            }]
        });

        // Calculate total amount
        const totalAmount = cartItems.reduce((sum, item) => sum + (item.Book.price * item.quantity), 0);

        res.render('books/cart', {
            title: 'My Cart',
            cartItems,
            totalAmount,
            purchases,
            user,
            moment: require('moment')
        });
    } catch (error) {
        console.error('Error fetching cart:', error);
        res.redirect('/error');
    }
});

// Get Purchase History
router.get('/purchases', auth, async (req, res) => {
    try {
        const user = req.user;
        const purchases = await Order.findAll({
            where: { userId: user.id },
            include: [{
                model: OrderItem,
                include: [{
                    model: Book,
                    attributes: ['id', 'title', 'author', 'price', 'coverImage']
                }]
            }]
        });

        res.json(purchases);
    } catch (error) {
        console.error('Error fetching purchases:', error);
        res.status(500).json({ message: 'Error fetching purchases' });
    }
});

// Checkout route
router.post('/checkout', auth, async (req, res) => {
    try {
        const user = req.user;
        const { 
            firstName, lastName, email, phone, 
            address, city, zip, 
            cardName, cardNumber, expDate, cvv 
        } = req.body;

        // Get cart items
        const cartItems = await Cart.findAll({
            where: { userId: user.id },
            include: [{
                model: Book,
                attributes: ['id', 'title', 'author', 'price']
            }]
        });

        if (!cartItems || cartItems.length === 0) {
            return res.status(400).json({ message: 'Cart is empty' });
        }

        // Calculate total amount
        const totalAmount = cartItems.reduce((sum, item) => sum + (item.Book.price * item.quantity), 0);

        // Create mock payment details
        const paymentDetails = {
            transactionId: `MOCK-${Date.now()}`,
            method: 'Credit Card',
            status: 'Completed',
            date: new Date().toISOString(),
            cardLast4: cardNumber.slice(-4),
            cardType: 'Visa', // You can add logic to determine card type based on number
            cardholderName: cardName
        };

        // Create payment record
        const payment = await Payment.create({
            userId: user.id,
            amount: totalAmount,
            status: paymentDetails.status,
            paymentMethod: paymentDetails.method,
            transactionId: paymentDetails.transactionId,
            cardLast4: paymentDetails.cardLast4,
            cardType: paymentDetails.cardType,
            cardholderName: paymentDetails.cardholderName
        });

        // Create order
        const order = await Order.create({
            userId: user.id,
            paymentId: payment.id,
            status: 'completed',
            totalAmount,
            shippingAddress: {
                firstName,
                lastName,
                email,
                phone,
                address,
                city,
                zip
            }
        });

        // Create order items
        for (const item of cartItems) {
            await OrderItem.create({
                orderId: order.id,
                bookId: item.bookId,
                quantity: item.quantity,
                price: item.Book.price
            });
        }

        // Clear cart
        await Cart.destroy({
            where: { userId: user.id }
        });

        // Get all orders for user
        const orders = await Order.findAll({
            where: { userId: user.id },
            include: [{
                model: OrderItem,
                include: [{
                    model: Book,
                    attributes: ['id', 'title', 'author', 'price', 'coverImage']
                }]
            }]
        });

        res.render('books/checkout-success', {
            title: 'Purchase Successful',
            order,
            paymentDetails,
            orders,
            user
        });

    } catch (error) {
        console.error('Error during checkout:', error);
        res.status(500).json({ message: 'Error processing checkout' });
    }
});

// Helper function to format book data from Google Books API
function formatBook(bookData) {
    const volumeInfo = bookData.volumeInfo || {};
    
    return {
        id: bookData.id,
        title: volumeInfo.title || 'No Title',
        author: (volumeInfo.authors && volumeInfo.authors[0]) || 'Unknown Author',
        description: volumeInfo.description ? volumeInfo.description.trim() : 'No description available',
        publisher: volumeInfo.publisher || 'Unknown Publisher',
        publishedDate: volumeInfo.publishedDate ? new Date(volumeInfo.publishedDate) : null,
        pageCount: volumeInfo.pageCount || 0,
        language: volumeInfo.language || 'en',
        rating: volumeInfo.averageRating || 0,
        ratingCount: volumeInfo.ratingsCount || 0,
        previewLink: volumeInfo.previewLink || null,
        coverImage: volumeInfo.imageLinks?.thumbnail || '/images/default-book.png',
        price: volumeInfo.listPrice?.amount || 0,
        condition: 'new', // Default condition for new books from API
        userId: null // Will be set when user adds to cart or sells
    };
}

module.exports = router;
