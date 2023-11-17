const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const cors = require("cors");

const app = express();
const port = 443;

const crypto = require("crypto");

function generateToken() {
  return crypto.randomBytes(32).toString("hex");
}

const uri =
  "mongodb+srv://enzos3397:chxbXzABNUKGZjyh@cluster0.wwjtv7n.mongodb.net/";

mongoose.connect(uri);
app.use(cors());

// Define the admin schema
const adminSchema = new mongoose.Schema({
  username: String,
  password: String,
  token: { type: String, default: () => generateToken() },
});

// Define the admin model
const Admin = mongoose.model("Admin", adminSchema);

// Define the brand schema
const brandSchema = new mongoose.Schema({
  name: String,
  logo_url: String,
});

// Define the brand model
const Brand = mongoose.model("Brand", brandSchema);

// Define the product schema
const productSchema = new mongoose.Schema({
  name: String,
  description: String,
  image_url: String,
  price: Number,
  brand: { type: mongoose.Schema.Types.ObjectId, ref: "Brand" },
});

// Define the product model
const Product = mongoose.model("Product", productSchema);

app.use(bodyParser.json());

// Middleware to check authorization for admin routes
const authorizeAdmin = async (req, res, next) => {
  console.log("Authorization Middleware");
  const token = req.headers.authorization;

  if (!token) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const admin = await Admin.findOne({ token });
    if (!admin) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Attach the admin to the request for later use if needed
    req.admin = admin;
    next();
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// Route to create a new admin (for simplicity, you can implement a more secure registration process)
app.post("/admins", async (req, res) => {
  const { username, password } = req.body;

  try {
    const token = generateToken(); // Generate a secure token (you may use a library for this)
    const newAdmin = new Admin({ username, password, token });
    const savedAdmin = await newAdmin.save();
    res.status(201).json(savedAdmin);
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.get("/admins/login", async (req, res) => {
  const { username, password } = req.query;

  try {
    const admin = await Admin.findOne({ username, password });

    if (admin) {
      res.json({ success: true, message: "Login successful!" });
    } else {
      res.json({ success: false, message: "Invalid username or password." });
    }
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Route to get all brands
app.get("/brands", async (req, res) => {
  console.log("GET Brands Route");
  try {
    const brands = await Brand.find();
    res.json(brands);
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Route to get all products
app.get("/products", async (req, res) => {
  console.log("GET Products Route");
  try {
    const products = await Product.find().populate("brand"); // Populate the brand information
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Apply the authorization middleware to admin routes
app.use(["/products", "/brands"], authorizeAdmin);

// Route to create a new brand
app.post("/brands", async (req, res) => {
  const { name, logo_url } = req.body;

  try {
    const newBrand = new Brand({ name, logo_url });
    const savedBrand = await newBrand.save();
    res.status(201).json(savedBrand);
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Route to filter products by name and description
app.get("/products/search", async (req, res) => {
  const { name, description } = req.query;

  try {
    const products = await Product.find({
      $or: [
        { name: new RegExp(name, "i") },
        { description: new RegExp(description, "i") },
      ],
    }).populate("brand"); // Populate the brand information

    res.json(products);
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Route to create a new product
app.post("/products", async (req, res) => {
  const { name, description, image_url, price, brand } = req.body;

  try {
    const newProduct = new Product({
      name,
      description,
      image_url,
      price,
      brand,
    });
    const savedProduct = await newProduct.save();
    res.status(201).json(savedProduct);
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});
// Route to update a product by ID
app.put("/products/:id", async (req, res) => {
  const productId = req.params.id;
  const { name, description, image_url, price, brand } = req.body;

  try {
    // Check if brand information is provided
    if (brand && brand.name) {
      // Update the brand information
      const updatedBrand = await Brand.findByIdAndUpdate(
        brand._id,
        { name: brand.name, logo_url: brand.logo_url }, // Add any other fields you want to update
        { new: true }
      );

      if (!updatedBrand) {
        return res.status(404).json({ error: "Brand not found" });
      }
    }

    // Update the product information
    const updatedProduct = await Product.findByIdAndUpdate(
      productId,
      { name, description, image_url, price, brand: brand?._id }, // Use brand ID instead of the entire brand object
      { new: true }
    ).populate("brand");

    if (updatedProduct) {
      res.json(updatedProduct);
    } else {
      res.status(404).json({ error: "Product not found" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Route to delete a product by ID
app.delete("/products/:id", async (req, res) => {
  const productId = req.params.id;

  try {
    const deletedProduct = await Product.findByIdAndDelete(productId);

    if (deletedProduct) {
      res.json(deletedProduct);
    } else {
      res.status(404).json({ error: "Product not found" });
    }
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
