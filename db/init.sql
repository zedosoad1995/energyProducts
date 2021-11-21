CREATE DATABASE IF NOT EXISTS energy_products;

CREATE TABLE IF NOT EXISTS reviews(
    id INT AUTO_INCREMENT PRIMARY KEY,
    rating INT,
    numReviews INT
);

CREATE TABLE IF NOT EXISTS distributors(
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    url VARCHAR(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS categories(
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    url VARCHAR(255) NOT NULL,
    distributorID INT NOT NULL,
    FOREIGN KEY (distributorID)
        REFERENCES distributors (id)
        ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS products(
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    brand VARCHAR(50) NOT NULL,
    url VARCHAR(255) NOT NULL,
    categoryID INT NOT NULL,
    reviewsID INT,
    distributorID INT NOT NULL,
    FOREIGN KEY (reviewsID)
        REFERENCES reviews (id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    FOREIGN KEY (distributorID)
        REFERENCES distributors (id)
        ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS productAttributeTypes(
    id INT AUTO_INCREMENT PRIMARY KEY,
    attributeName VARCHAR(100) NOT NULL,
    datatype VARCHAR(20) NOT NULL
);

CREATE TABLE IF NOT EXISTS productAttributes(
    id INT AUTO_INCREMENT PRIMARY KEY,
    value INT,
    productID INT NOT NULL,
    productAttribTypeID INT NOT NULL,
    FOREIGN KEY (productID)
        REFERENCES products (id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    FOREIGN KEY (productAttribTypeID)
        REFERENCES productAttributeTypes (id)
        ON UPDATE CASCADE ON DELETE CASCADE
);