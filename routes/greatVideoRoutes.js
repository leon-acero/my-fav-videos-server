const express = require('express');

// Controllers
const greatVideoController = require('../controllers/greatVideoController');
// const authController = require('../controllers/authController');

// como convencion cambiare el nombre de greatVideoRouter a router
const router = express.Router();

// Obtengo todos los videos
// Creo un Video
router
	.route('/')
		.get( 
            // authController.protect, 
			// authController.restrictTo ('admin'),
			greatVideoController.getAllGreatVideos)

		.post(
            // authController.protect, 
			// authController.restrictTo ('admin'), 
			greatVideoController.createGreatVideo);

// Obtengo un video
// Actualizo un video
// Borro un video
router
	.route('/:id')
		.get( 
            // authController.protect, 
			// authController.restrictTo ('admin'),
			greatVideoController.getGreatVideo)

		.patch(
            // authController.protect, 
			// authController.restrictTo ('admin'),
			greatVideoController.updateGreatVideo)
	
		.delete(
                // authController.protect, 
				// authController.restrictTo('admin'),
				greatVideoController.deleteGreatVideo);


///////////////////////////////////////////////////////////////////
// Hago la búsqueda de un greatVideoo usando su nombre
  
router
	.route('/search-greatVideo/:byMyTitle')
		.get( 
            // authController.protect, 
			// authController.restrictTo ('admin'),
			// greatVideoController.aliasProductByMyTitle, 
			greatVideoController.getAllGreatVideos);

// router
// 	.route('/search-youtube/:youtubeLink')
// 		.get( 
// 			// authController.protect, 
// 			// authController.restrictTo ('admin'),
// 			greatVideoController.getYoutubeVideo);

router
      .route('/search-youtube')
            .post( 
                  // authController.protect, 
                  // authController.restrictTo ('admin'),
                  greatVideoController.getYoutubeVideo); 

router
	.route('/getVideosByTags')
		.post( 
				// authController.protect, 
				// authController.restrictTo ('admin'),
				greatVideoController.getVideosByTags); 

router
	.route('/getYoutubeVideosFromPlaylist')
		.post( 
				// authController.protect, 
				// authController.restrictTo ('admin'),
				greatVideoController.getYoutubeVideosFromPlaylist); 

// ahora exporto el router para impotarlo en app.js
// cuando solo tengo una cosa que exportar hago asi
module.exports = router;