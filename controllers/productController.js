// Models
const Product = require('../models/productModel');

// Utils
const catchAsync = require('../Utils/catchAsync');
const AppError = require('../Utils/appError');


///////////////////////////////////////////////////////////////////
// Factory
const factory = require('./handlerFactory');

exports.updateProduct = factory.updateOne(Product);
exports.deleteProduct = factory.deleteOne(Product);
exports.createProduct = factory.createOne(Product);
exports.getProduct = factory.getOne(Product);
exports.getAllProducts = factory.getAll(Product);



///////////////////////////////////////////////////////////////////
// Making The API Better: Aliasing
///////////////////////////////////////////////////////////////////
exports.aliasProductByProductName = (req, res, next) => {
	
	req.query = {
		productName: {
			regex: `(?i)${req.params.byProductName}`
		},
		sort: 'productName'
	}
	next(); 
};