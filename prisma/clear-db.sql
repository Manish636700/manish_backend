-- Clear all data from tables in reverse dependency order
SET FOREIGN_KEY_CHECKS = 0;

-- Clear tables with foreign keys first
DELETE FROM OrderItem;
DELETE FROM Review;
DELETE FROM CartItem;
DELETE FROM ProductTag;
DELETE FROM ProductSize;
DELETE FROM TopPickProduct;
DELETE FROM Media;
DELETE FROM Product;

-- Clear main tables
DELETE FROM Cart;
DELETE FROM Order;
DELETE FROM User;
DELETE FROM Category;
DELETE FROM Tag;
DELETE FROM Size;
DELETE FROM Offer;
DELETE FROM HomePageImage;

SET FOREIGN_KEY_CHECKS = 1;
