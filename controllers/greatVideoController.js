// Models
const axios = require('axios');

const YOUTUBE_LINK = "https://youtube.googleapis.com/youtube/v3";


const GreatVideo = require('../models/greatVideoModel');

// Utils
const catchAsync = require('../Utils/catchAsync');
const AppError = require('../Utils/appError');


///////////////////////////////////////////////////////////////////
// Factory
const factory = require('./handlerFactory');

exports.updateGreatVideo = factory.updateOne(GreatVideo);
exports.deleteGreatVideo = factory.deleteOne(GreatVideo);
exports.createGreatVideo = factory.createOne(GreatVideo);
exports.getGreatVideo = factory.getOne(GreatVideo);
exports.getAllGreatVideos = factory.getAll(GreatVideo);



///////////////////////////////////////////////////////////////////
// Making The API Better: Aliasing
///////////////////////////////////////////////////////////////////
exports.aliasGreatVideoByMyTitle = (req, res, next) => {
	
	req.query = {
		myTitle: {
			regex: `(?i)${req.params.byMyTitle}`
		},
		sort: 'myTitle'
	}
	next(); 
};

function YouTubeGetID(url){
    url = url.split(/(vi\/|v=|\/v\/|youtu\.be\/|\/embed\/)/);
    return (url[2] !== undefined) ? url[2].split(/[^0-9a-z_-]/i)[0] : url[0];
}



exports.getYoutubeVideo = catchAsync( async (req, res, next) => {

	// console.log("req.body", req.body)

	let videoId = "";

	if (req.body.youtubeLink !== "")
		videoId = YouTubeGetID(req.body.youtubeLink);
 
	const videoDetails = await axios ( {
		method: 'GET',
		url: `${YOUTUBE_LINK}/videos?part=snippet&id=${videoId}&key=${process.env.YOUTUBE_API_KEY}`,
		withCredentials: true
	});

	if (!videoDetails) {
		return next (new AppError ('No se encontró el video', 400));
	}

	// console.log(videoDetails.data.items[0]);

	// Obtiene la duracion del video
	const videoDuration = await axios ({
		method: 'GET',
		url: `${YOUTUBE_LINK}/videos?id=${videoId}&part=contentDetails&key=${process.env.YOUTUBE_API_KEY}`,
		withCredentials: true
	});

	// console.log(videoDuration.data.items[0].contentDetails.duration);

	if (!videoDuration) {
		return next (new AppError ('No se encontró datos sobre la duración del video', 400));
	}

	// Obtiene el logo del canal
	const channelLogo = await axios ({
		method: 'GET',
		url: `${YOUTUBE_LINK}/channels?part=snippet&id=${videoDetails.data.items[0].snippet.channelId}&key=${process.env.YOUTUBE_API_KEY}`,
		withCredentials: true
	});

	// console.log(channelLogo.data.items[0].snippet.thumbnails);

	if (!channelLogo) {
		return next (new AppError ('No se encontró datos sobre el logo del canal', 400));
	}

	// Create Great Video
	/*
		{
			"tags": [ 
				"Calisthenicmovement",
				"Abs",
				"The Only Ab Exercise you really need!"
			],
			"myTitle": "The Only Ab Exercise you really need!",
			"myDescription": "Ejercicio para Abs",

			"channelTitle": "Calisthenicmovement",
			"channelId": "UCZIIRX8rkNjVpP-oLMHpeDw",

			"profileLogoUrl": "https://yt3.ggpht.com/ytc/AGIKgqPhpkYzjJSC02eQuZTOQhz04BA6v3ImQCk4TFqgBQ=s240-c-k-c0x00ffffff-no-rj",
			"profileLogoWidth": 240,
			"profileLogoHeight": 240,

			"videoId": "G9Q3XdeGTvM",
			"videoUrl": "https://youtu.be/G9Q3XdeGTvM&t=166",

			"originalTitle": "The Only Ab Exercise you really need!",
			"originalDescription": "Our Workout Programs: ➡️ https://calimove.com ⬅️\n\n✔️Instagram ➢ https://instagram.com/calimove\n✔️Facebook ➢ https://www.facebook.com/pages/Calisthenic-Movement/154846744637610",

			"duration": "PT3M45S",

			"thumbnailUrl": "https://i.ytimg.com/vi/G9Q3XdeGTvM/maxresdefault.jpg",
			"thumbnailWidth": 1280,
			"thumbnailHeight": 720,

			"slug": ""
		}
	*/

	res.status(200).json({
		status: 'success',
		data: {
			videoDetails: videoDetails.data,
			videoDuration: videoDuration.data.items[0].contentDetails.duration,
			channelLogo: channelLogo.data.items[0].snippet.thumbnails
		}	
	});

});

exports.getVideosByTags = catchAsync( async (req, res, next) => {

	// console.log("req.body", req.body)
	const tags = req.body
	// console.log("tags.tags", tags.tags	)

	const greatVideo = await GreatVideo.find(  
		{ 
			tags: { 
				$all: tags.tags 
			} 
		}
	);

	// // Verifico si el User se encontró
	if (!greatVideo || greatVideo.length === 0) {
		// 404 statusCode Not Found
		return next ( new AppError('No existen videos con esos tags.', 404 ) );
	}

	console.log("greatVideo", greatVideo)

	res.status(200).json({
		status: 'success',
		data: greatVideo	
	});
});