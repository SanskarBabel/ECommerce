const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = 'your-secret-key-change-in-production';

// Middleware
app.use(cors());
app.use(express.json());

// Data storage paths
const USERS_FILE = path.join(__dirname, 'data', 'users.json');
const PRODUCTS_FILE = path.join(__dirname, 'data', 'products.json');
const CARTS_FILE = path.join(__dirname, 'data', 'carts.json');

// Ensure data directory exists
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Initialize data files
const initializeDataFiles = () => {
  if (!fs.existsSync(USERS_FILE)) {
    fs.writeFileSync(USERS_FILE, JSON.stringify([]));
  }
  
  if (!fs.existsSync(PRODUCTS_FILE)) {
    const defaultProducts = [
      {
        id: 1,
        name: 'Wireless Headphones',
        price: 99.99,
        category: 'Electronics',
        description: 'High-quality wireless headphones with noise cancellation',
        image: 'https://images.pexels.com/photos/3394650/pexels-photo-3394650.jpeg?auto=compress&cs=tinysrgb&w=300'
      },
      {
        id: 2,
        name: 'Smartphone',
        price: 599.99,
        category: 'Electronics',
        description: 'Latest smartphone with advanced camera features',
        image: 'https://images.pexels.com/photos/607812/pexels-photo-607812.jpeg?auto=compress&cs=tinysrgb&w=300'
      },
      {
        id: 3,
        name: 'Coffee Maker',
        price: 149.99,
        category: 'Appliances',
        description: 'Automatic coffee maker with programmable timer',
        image: 'https://images.pexels.com/photos/6207363/pexels-photo-6207363.jpeg?auto=compress&cs=tinysrgb&w=300'
      },
      {
        id: 4,
        name: 'Running Shoes',
        price: 79.99,
        category: 'Sports',
        description: 'Comfortable running shoes for daily workouts',
        image: 'https://images.pexels.com/photos/2529148/pexels-photo-2529148.jpeg?auto=compress&cs=tinysrgb&w=300'
      },
      {
        id: 5,
        name: 'Laptop',
        price: 999.99,
        category: 'Electronics',
        description: 'High-performance laptop for work and gaming',
        image: 'https://images.pexels.com/photos/18105/pexels-photo.jpg?auto=compress&cs=tinysrgb&w=300'
      },
      {
        id: 6,
        name: 'Yoga Mat',
        price: 29.99,
        category: 'Sports',
        description: 'Non-slip yoga mat for home workouts',
        image: 'https://images.pexels.com/photos/4056723/pexels-photo-4056723.jpeg?auto=compress&cs=tinysrgb&w=300'
      }
    ];
    fs.writeFileSync(PRODUCTS_FILE, JSON.stringify(defaultProducts, null, 2));
  }
  
  if (!fs.existsSync(CARTS_FILE)) {
    fs.writeFileSync(CARTS_FILE, JSON.stringify({}));
  }
};

initializeDataFiles();

// Helper functions
const readJsonFile = (filePath) => {
  try {
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return [];
  }
};

const writeJsonFile = (filePath, data) => {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
};

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

// Auth Routes
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    
    if (!email || !password || !name) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const users = readJsonFile(USERS_FILE);
    
    // Check if user already exists
    if (users.find(user => user.email === email)) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create new user
    const newUser = {
      id: Date.now(),
      email,
      password: hashedPassword,
      name
    };
    
    users.push(newUser);
    writeJsonFile(USERS_FILE, users);

    // Generate token
    const token = jwt.sign({ id: newUser.id, email }, JWT_SECRET);
    
    res.status(201).json({
      token,
      user: { id: newUser.id, email, name }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const users = readJsonFile(USERS_FILE);
    const user = users.find(u => u.email === email);
    
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Generate token
    const token = jwt.sign({ id: user.id, email }, JWT_SECRET);
    
    res.json({
      token,
      user: { id: user.id, email, name: user.name }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Product Routes
app.get('/api/products', (req, res) => {
  try {
    let products = readJsonFile(PRODUCTS_FILE);
    
    // Apply filters
    const { category, minPrice, maxPrice, search } = req.query;
    
    if (category && category !== 'all') {
      products = products.filter(p => p.category.toLowerCase() === category.toLowerCase());
    }
    
    if (minPrice) {
      products = products.filter(p => p.price >= parseFloat(minPrice));
    }
    
    if (maxPrice) {
      products = products.filter(p => p.price <= parseFloat(maxPrice));
    }
    
    if (search) {
      products = products.filter(p => 
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.description.toLowerCase().includes(search.toLowerCase())
      );
    }
    
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

app.get('/api/products/categories', (req, res) => {
  try {
    const products = readJsonFile(PRODUCTS_FILE);
    const categories = [...new Set(products.map(p => p.category))];
    res.json(categories);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Cart Routes
app.get('/api/cart', authenticateToken, (req, res) => {
  try {
    const carts = readJsonFile(CARTS_FILE);
    const userCart = carts[req.user.id] || [];
    res.json(userCart);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/cart', authenticateToken, (req, res) => {
  try {
    const { productId, quantity = 1 } = req.body;
    const carts = readJsonFile(CARTS_FILE);
    const products = readJsonFile(PRODUCTS_FILE);
    
    const product = products.find(p => p.id === productId);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    if (!carts[req.user.id]) {
      carts[req.user.id] = [];
    }
    
    const existingItem = carts[req.user.id].find(item => item.productId === productId);
    
    if (existingItem) {
      existingItem.quantity += quantity;
    } else {
      carts[req.user.id].push({
        productId,
        quantity,
        product
      });
    }
    
    writeJsonFile(CARTS_FILE, carts);
    res.json({ message: 'Item added to cart' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

app.delete('/api/cart/:productId', authenticateToken, (req, res) => {
  try {
    const productId = parseInt(req.params.productId);
    const carts = readJsonFile(CARTS_FILE);
    
    if (carts[req.user.id]) {
      carts[req.user.id] = carts[req.user.id].filter(item => item.productId !== productId);
      writeJsonFile(CARTS_FILE, carts);
    }
    
    res.json({ message: 'Item removed from cart' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

app.put('/api/cart/:productId', authenticateToken, (req, res) => {
  try {
    const productId = parseInt(req.params.productId);
    const { quantity } = req.body;
    const carts = readJsonFile(CARTS_FILE);
    
    if (carts[req.user.id]) {
      const item = carts[req.user.id].find(item => item.productId === productId);
      if (item) {
        if (quantity <= 0) {
          carts[req.user.id] = carts[req.user.id].filter(item => item.productId !== productId);
        } else {
          item.quantity = quantity;
        }
        writeJsonFile(CARTS_FILE, carts);
      }
    }
    
    res.json({ message: 'Cart updated' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});