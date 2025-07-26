const express = require('express');
const router = express.Router();
const axios = require('axios');
const { models } = require('../config/db');
const { Book, User, Cart, Saved, Payment, Order, OrderItem, Challenge, UserAttempts } = models;
const auth = require('../middleware/auth');

// GET /books - Display all books with pagination
router.get('/', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 12;
        const startIndex = (page - 1) * limit;

        // Fetch books from Google Books API with pagination
        const response = await axios.get('https://www.googleapis.com/books/v1/volumes', {
            params: {
                q: 'subject:fiction',
                maxResults: limit,
                startIndex: startIndex,
                orderBy: 'relevance'
            }
        });

        // Format books
        const books = (response?.data?.items || []).map(book => formatBook(book));
        const totalItems = response?.data?.totalItems || 0;
        const totalPages = Math.ceil(totalItems / limit);

        res.render('books/index', {
            title: 'All Books',
            books,
            user: req.user,
            pagination: {
                currentPage: page,
                totalPages: totalPages,
                hasPrevious: page > 1,
                hasNext: page < totalPages,
                previousPage: page - 1,
                nextPage: page + 1
            }
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
async function getBookImage(title, description) {
    try {
        // Extract keywords from title and description
        const keywords = (title + ' ' + description)
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
                per_page: 1,
                orientation: 'portrait' // Books typically have portrait orientation
            }
        });

        // Return the first image if found
        if (response.data && response.data.results && response.data.results[0]) {
            // Get the medium size image for better quality
            return response.data.results[0].urls.regular;
        }
        
        // If no image found, try with more general search terms
        const generalSearch = ['book', 'reading', 'literature', 'novel'].join('+');
        const generalResponse = await axios.get(`https://api.unsplash.com/search/photos`, {
            params: {
                query: generalSearch,
                client_id: process.env.UNSPLASH_ACCESS_KEY,
                per_page: 1,
                orientation: 'portrait'
            }
        });

        if (generalResponse.data && generalResponse.data.results && generalResponse.data.results[0]) {
            return generalResponse.data.results[0].urls.regular;
        }

        // If all else fails, return a default book image
        return '/images/default-book.png';
    } catch (error) {
        console.error('Error fetching book image:', error);
        return '/images/default-book.png';
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
        const coverImage = await getBookImage(title, description);

        // Create the book
        const book = await Book.create({
            id: bookId,
            title,
            author,
            description,
            price: parseFloat(price),
            condition,
            userId: user.id,
            coverImage: coverImage
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
        
        // First try to find the book in our database
        let book = await Book.findByPk(bookId, {
            attributes: {
                exclude: ['userId']
            }
        });

        if (!book) {
            // Try to fetch from Google Books API
            try {
                // First try searching by ISBN
                const isbnResponse = await axios.get('https://www.googleapis.com/books/v1/volumes', {
                    params: {
                        q: `isbn:${bookId}`
                    }
                });
                
                if (isbnResponse.data && isbnResponse.data.items && isbnResponse.data.items[0]) {
                    const bookData = isbnResponse.data.items[0];
                    book = formatBook(bookData);
                    await Book.create(book);
                } else {
                    // If not found by ISBN, try searching by title
                    const titleResponse = await axios.get('https://www.googleapis.com/books/v1/volumes', {
                        params: {
                            q: `intitle:${bookId}`
                        }
                    });

                    if (titleResponse.data && titleResponse.data.items && titleResponse.data.items[0]) {
                        const bookData = titleResponse.data.items[0];
                        book = formatBook(bookData);
                        await Book.create(book);
                    } else {
                        // If still not found, try a general search
                        const generalResponse = await axios.get('https://www.googleapis.com/books/v1/volumes', {
                            params: {
                                q: bookId
                            }
                        });

                        if (generalResponse.data && generalResponse.data.items && generalResponse.data.items[0]) {
                            const bookData = generalResponse.data.items[0];
                            book = formatBook(bookData);
                            await Book.create(book);
                        } else {
                            return res.status(404).render('error', {
                                title: 'Book Not Found',
                                message: 'The requested book does not exist'
                            });
                        }
                    }
                }
            } catch (apiError) {
                console.error('Error fetching book from Google Books API:', apiError);
                return res.status(500).render('error', {
                    title: 'Error',
                    message: 'Error fetching book data'
                });
            }
        }

        // Format the published date
        book.formattedDate = formatDate(book.publishedDate);

        // Ensure we have all necessary fields
        if (!book.price) {
            book.price = 19.99; // Default price
        }
        if (!book.condition) {
            book.condition = 'New'; // Default condition
        }

        // Phase 3: Check if book has a challenge and get challenge data
        let challenge = null;
        let attemptCount = 0;
        let userHasSolved = false;
        let hasExistingChallenge = false; // For book owner

        try {
            // Check if book has an active challenge
            challenge = await Challenge.findOne({
                where: { 
                    bookId: bookId,
                    isActive: true 
                },
                attributes: ['id', 'question', 'difficulty', 'createdBy'] // Include createdBy
            });

            if (challenge) {
                hasExistingChallenge = true;
                
                if (req.user) {
                    // If current user is the challenge creator (book owner), don't show challenge interface
                    if (challenge.createdBy === req.user.id) {
                        challenge = null; // Owner sees normal book content
                    } else {
                        // For other users, check if they've solved it
                        const attempts = await UserAttempts.findAll({
                            where: {
                                challengeId: challenge.id,
                                userId: req.user.id
                            }
                        });
                        
                        attemptCount = attempts.length;
                        userHasSolved = attempts.some(attempt => attempt.isCorrect);
                        
                        // If user has solved it, don't show challenge interface
                        if (userHasSolved) {
                            challenge = null;
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Error fetching challenge data:', error);
            // Continue without challenge data if there's an error
        }

        res.render('books/detail', {
            title: book.title,
            book,
            challenge,
            attemptCount,
            userHasSolved,
            hasExistingChallenge, // Pass this to template
            user: req.user
        });
    } catch (error) {
        console.error('Error fetching book details:', error);
        res.status(500).render('error', {
            title: 'Error',
            message: 'Error fetching book details'
        });
    }
});

// GET /books/:id/edit - Show edit form for a book
router.get('/:id/edit', auth, async (req, res) => {
    try {
        const book = await Book.findByPk(req.params.id);
        if (!book || book.userId !== req.user.id) {
            req.flash('error', 'Book not found or unauthorized');
            return res.redirect('/profile/books');
        }
        res.render('books/edit', {
            title: 'Edit Book',
            book,
            user: req.user
        });
    } catch (error) {
        console.error('Error loading edit form:', error);
        req.flash('error', 'Error loading edit form');
        res.redirect('/profile/books');
    }
});

// POST /books/:id/edit - Handle book edit form submission
router.post('/:id/edit', auth, async (req, res) => {
    try {
        const book = await Book.findByPk(req.params.id);
        if (!book || book.userId !== req.user.id) {
            req.flash('error', 'Book not found or unauthorized');
            return res.redirect('/profile/books');
        }
        const { title, author, price, condition, description, status } = req.body;
        await book.update({ title, author, price, condition, description, status });
        req.flash('success', 'Book updated successfully');
        res.redirect('/profile/books');
    } catch (error) {
        console.error('Error updating book:', error);
        req.flash('error', 'Error updating book');
        res.redirect('/profile/books');
    }
});

// POST /books/:id/delete - Delete a book
router.post('/:id/delete', auth, async (req, res) => {
    try {
        const book = await Book.findByPk(req.params.id);
        if (!book || book.userId !== req.user.id) {
            req.flash('error', 'Book not found or unauthorized');
            return res.redirect('/profile/books');
        }
        await book.destroy();
        req.flash('success', 'Book deleted successfully');
        res.redirect('/profile/books');
    } catch (error) {
        console.error('Error deleting book:', error);
        req.flash('error', 'Error deleting book');
        res.redirect('/profile/books');
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

// GET Cart
router.get('/cart', auth, async (req, res) => {
    try {
        const user = req.user;

        // Get all cart items for this user
        const cartItems = await Cart.findAll({
            where: {
                userId: user.id
            },
            include: [
                {
                    model: Book,
                    as: 'book',
                    attributes: ['id', 'title', 'author', 'price', 'coverImage']
                }
            ]
        });

        // Calculate total
        const total = cartItems.reduce((sum, item) => sum + (item.book.price * item.quantity), 0);

        res.render('books/cart', {
            title: 'Shopping Cart',
            cartItems,
            total,
            user
        });
    } catch (error) {
        console.error('Error fetching cart:', error);
        res.status(500).render('error', {
            title: 'Error',
            message: 'Error fetching cart items'
        });
    }
});

// Add to Cart
router.post('/:bookId/add-to-cart', auth, async (req, res) => {
    try {
        const user = req.user;
        const bookId = req.params.bookId;
        const quantity = parseInt(req.body.quantity) || 1;

        // Check if user already has this book in cart
        const existingCartItem = await Cart.findOne({
            where: {
                userId: user.id,
                bookId
            }
        });

        if (existingCartItem) {
            // Update quantity if book already exists in cart
            await existingCartItem.update({
                quantity: existingCartItem.quantity + quantity
            });
        } else {
            // Create new cart item
            await Cart.create({
                userId: user.id,
                bookId,
                quantity
            });
        }

        // Get updated cart items
        const cartItems = await Cart.findAll({
            where: { userId: user.id },
            include: [{ model: Book, as: 'book' }]
        });

        // Calculate total
        const total = cartItems.reduce((sum, item) => {
            return sum + (item.book.price * item.quantity);
        }, 0);

        // Check if request is AJAX
        if (req.xhr) {
            // Return JSON for AJAX requests
            res.json({
                success: true,
                message: 'Item added to cart successfully',
                cartItems,
                total
            });
        } else {
            // Redirect to cart page for non-AJAX requests
            res.redirect('/cart');
        }

    } catch (error) {
        console.error('Error adding to cart:', error);
        if (req.xhr) {
            res.status(500).json({
                success: false,
                message: 'Failed to add item to cart. Please try again.'
            });
        } else {
            req.flash('error', 'Failed to add item to cart. Please try again.');
            res.redirect('back');
        }
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

// Helper function to format dates
const formatDate = (date) => {
    if (!date) return 'Unknown';
    const dateObj = new Date(date);
    return dateObj.getFullYear();
};

// Format book data from Google Books API
const formatBook = (bookData) => {
    const volumeInfo = bookData.volumeInfo || {};
    
    return {
        id: bookData.id || Date.now().toString(),
        title: volumeInfo.title || 'Untitled',
        author: volumeInfo.authors ? volumeInfo.authors.join(', ') : 'Unknown Author',
        description: volumeInfo.description || 'No description available',
        publisher: volumeInfo.publisher || 'Unknown Publisher',
        publishedDate: volumeInfo.publishedDate || new Date().toISOString().split('T')[0],
        pageCount: volumeInfo.pageCount || 0,
        language: volumeInfo.language || 'en',
        rating: volumeInfo.averageRating || 0,
        ratingCount: volumeInfo.ratingsCount || 0,
        previewLink: volumeInfo.previewLink || '#',
        price: 19.99, // Default price
        condition: 'New', // Default condition
        coverImage: volumeInfo.imageLinks?.thumbnail || 
                    volumeInfo.imageLinks?.smallThumbnail || 
                    '/images/default-book.png'
    };
};

module.exports = router;
