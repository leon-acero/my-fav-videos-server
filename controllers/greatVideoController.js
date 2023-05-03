const moment = require('moment');
const momentDurationFormatSetup = require("moment-duration-format");
const axios = require('axios');
const {ObjectId} = require('mongoose').Types;

// Se usa para llamar al Youtube API
const YOUTUBE_LINK = "https://youtube.googleapis.com/youtube/v3";

// Models
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

function youTubeGetID(url){
    url = url.split(/(vi\/|v=|\/v\/|youtu\.be\/|\/embed\/)/);
    return (url[2] !== undefined) ? url[2].split(/[^0-9a-z_-]/i)[0] : url[0];
}


function processDuration (duration) { 
	return moment.duration(duration).format('h:mm:ss').padStart(4, '0:0')
}


exports.getYoutubeVideo = catchAsync( async (req, res, next) => {

	// console.log("req.body", req.body)

	let videoId = "";
	const {videoUrl} = req.body;

	// console.log("videoUrl", videoUrl);

	if (videoUrl !== "")
		videoId = youTubeGetID(videoUrl);

	// console.log("videoId", videoId)

	// Primero checo si el videoUrl YA existe para el current user asi
	// me aseguro de no agregar videos repetidos para un usuario, excepto
	// si agrega un mismo video pero en diferentes current time
	// ESTO aun no se si agregarlo porque si es probable que el usuario
	// pueda agregar videos repetidos ya que diferentes Urls pueden tener
	// el mismo video, como ya es conocido hay urls con diferente formato
	// que apuntan al mismo video
 
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

	// console.log("videoDetails", videoDetails.data.items[0].snippet)

	let thumbnailUrl = "";
	let thumbnailHeight = 0;
	let thumbnailWidth = 0;

	if (videoDetails.data.items[0].snippet?.thumbnails?.maxres) {
		thumbnailUrl = videoDetails.data.items[0].snippet.thumbnails.maxres.url;
		thumbnailHeight = videoDetails.data.items[0].snippet.thumbnails.maxres.height;
		thumbnailWidth = videoDetails.data.items[0].snippet.thumbnails.maxres.width;
	}
	else if (videoDetails.data.items[0].snippet?.thumbnails?.standard) {
		thumbnailUrl = videoDetails.data.items[0].snippet.thumbnails.standard.url;
		thumbnailHeight = videoDetails.data.items[0].snippet.thumbnails.standard.height;
		thumbnailWidth = videoDetails.data.items[0].snippet.thumbnails.standard.width;
	}
	else if (videoDetails.data.items[0].snippet?.thumbnails?.high) {
		thumbnailUrl = videoDetails.data.items[0].snippet.thumbnails.high.url;
		thumbnailHeight = videoDetails.data.items[0].snippet.thumbnails.high.height;
		thumbnailWidth = videoDetails.data.items[0].snippet.thumbnails.high.width;
	}
	else if (videoDetails.data.items[0].snippet?.thumbnails?.medium) {
		thumbnailUrl = videoDetails.data.items[0].snippet.thumbnails.medium.url;
		thumbnailHeight = videoDetails.data.items[0].snippet.thumbnails.medium.height;
		thumbnailWidth = videoDetails.data.items[0].snippet.thumbnails.medium.width;
	}
	else if (videoDetails.data.items[0].snippet?.thumbnails?.default) {
		thumbnailUrl = videoDetails.data.items[0].snippet.thumbnails.default.url;
		thumbnailHeight = videoDetails.data.items[0].snippet.thumbnails.default.height;
		thumbnailWidth = videoDetails.data.items[0].snippet.thumbnails.default.width;
	}

	// console.log(videoDuration.data.items[0].contentDetails.duration);

	// const tempDuration = videoDuration.data.items[0].contentDetails.duration;
	// console.log("processDuration", processDuration(tempDuration));


	res.status(200).json({
		status: 'success',
		data: {
			channelTitle: videoDetails.data.items[0].snippet.channelTitle, 
			channelId: videoDetails.data.items[0].snippet.channelId,
		
			profileLogoUrl: channelLogo.data.items[0].snippet.thumbnails.medium.url, 
			profileLogoWidth: channelLogo.data.items[0].snippet.thumbnails.medium.width, 
			profileLogoHeight: channelLogo.data.items[0].snippet.thumbnails.medium.height, 
		
			// // Info del Video
			videoId: videoDetails.data.items[0].id, 
			videoUrl: videoUrl, 
			originalTitle: videoDetails.data.items[0].snippet.title, 
			originalDescription: videoDetails.data.items[0].snippet.description, 

			duration: processDuration(videoDuration.data.items[0].contentDetails.duration), 
		
			// Info del Thumbnail del Video
			thumbnailUrl: thumbnailUrl,
			thumbnailWidth: thumbnailWidth,
			thumbnailHeight: thumbnailHeight 		
		}	
	});

});

exports.getVideosByTags = catchAsync( async (req, res, next) => {


	// console.log("req.body", req.body)
	const { tags, checked } = req.body

	// console.log("tags", tags)
	// console.log("checked", checked)

	if  (tags.length === 0)
		return next ( new AppError('Captura unos tags para hacer la búsqueda.', 404 ) );

	// este es un boolean para identificar si ejecuto el query en $or o $and
	// si es true ejecuto $or, si es false entonces $and
	// const {ejecutarOr} = req.body;

	// Ejemplo con $and
	// si tags viene asi: 'abs' 'athlean-x'
	// entonces busco videos cuyos tengas tengan ambos a fuerzas
	// osea si hay abs con calisthenicmovement se omiten

	// Ejemplo con $or
	// si tags viene asi: 'abs' 'athlean-x'
	// entonces me trae todos los videos de athlean-x osea abs, pecho, pierna, etc
	// y me trae todos los videos de abs, osea athlean-x, calisthenicmovement, etc

	// console.log("tags", tags)

	// Creo un query para $or de MongoDB, es decir, que este query se ejecuta
	// cuando quiero que los tags tenga una condicion logica de OR
	// tambien creare un $and
	let query;
	// = {
	// 	$or: []
	// }

	if (checked) {
		query = {
			$and: []
		}
	}
	else {
		query = {
			$or: []
		}	
	}

	// aqui creo dinamicamente el query de busqueda segun los tags
	// que capturo el usuario
	tags.forEach(cur => {

		// creo una Regular Expresion la cual segun el formato de
		// MongoDB debe ir dentro de un Array asi
		// { $or: [ { tags: { $in: [ /^calisth/i] } }, ] }

		// el "i" es para case insensitive
		const regularExp = new RegExp(cur, "i");
		
		// y como dije la Regular Expression lo pongo dentro del Array 
		const arr = [];
		arr.push(regularExp)

		// y ahora creo el query con este formato
		// { $or: [ { tags: { $in: [ /^calisth/i] } }, ] }
		// todo esto ayuda a que NO sea necesario para el usuario
		//  escribir la palabra completa del tag en front-end
		// por ejemplo: athlean y me trae Athlean-X y cualquier cosa
		// que empiece con athlean, y con "i", me aseguro que no
		// importe si el usuario escribe mayusculas o minusculas
		if (checked) 
			query.$and.push({tags: {$in: arr}})
		else
			query.$or.push({tags: {$in: arr}})
		
	})

	// console.log("query", query)

	const greatVideo = await GreatVideo.find( query );

	// console.log("greatVideo", greatVideo)

	// // Verifico si el User se encontró
	if (!greatVideo || greatVideo.length === 0) {
		// 404 statusCode Not Found
		return next ( new AppError('No existen videos con esos tags.', 404 ) );
	}


	res.status(200).json({
		status: 'success',
		data: greatVideo	
	});
});


function getYoutubePlayList(url){
	const regExp = /^.*(youtu.be\/|list=)([^#\&\?]*).*/;
	const match = url.match(regExp);

	if (match && match[2]){
		return match[2];
	}
	return null;

    // url = url.split(/(vi\/|v=|\/v\/|youtu\.be\/|\/embed\/)/);
    // return (url[2] !== undefined) ? url[2].split(/[^0-9a-z_-]/i)[0] : url[0];
}



exports.getYoutubeVideosFromPlaylist = catchAsync( async (req, res, next) => {

	// console.log("req.body", req.body)

	let youtubePlayList = "";
	const {videoUrl} = req.body;

	const maxResults = 6;

	// console.log("videoUrl", videoUrl);

	if (videoUrl !== "")
		youtubePlayList = getYoutubePlayList(videoUrl);

	// console.log("youtubePlayList", youtubePlayList)

	// Primero checo si el videoUrl YA existe para el current user asi
	// me aseguro de no agregar videos repetidos para un usuario, excepto
	// si agrega un mismo video pero en diferentes current time
	// ESTO aun no se si agregarlo porque si es probable que el usuario
	// pueda agregar videos repetidos ya que diferentes Urls pueden tener
	// el mismo video, como ya es conocido hay urls con diferente formato
	// que apuntan al mismo video

	// Esta API de playlistItems regresa la informacion que necesito
	// (totalResultss)
	// pero la regresa despues que la mando llamar, osea el total de
	// videos: 
	/*
	  	"pageInfo": {
		"totalResults": 3997,
		"resultsPerPage": 5
	}
	*/
 
	// console.log("Comienza a sacar la informacion de los videos", new Date(Date.now()))
	console.log("Comienza a sacar la informacion de los videos", new Date(Date.now()))

	let playlistItems = await axios ( {
		method: 'GET',
		url: `${YOUTUBE_LINK}/playlistItems?part=snippet&playlistId=${youtubePlayList}&key=${process.env.YOUTUBE_API_KEY}&maxResults=${maxResults}`,
		withCredentials: true
	});


	if (!playlistItems || playlistItems.data.items.length === 0) {
		return next (new AppError ('No se encontró videos en el Playlist o no existe el Playlist o no tiene acceso al Playlist, verifica si es Público', 400));
	}

	// console.log("dataItems", playlistItems.data);
	console.log("playlist total results", playlistItems.data.pageInfo.totalResults)
	// console.log("playlist nextPageToken", playlistItems.data.nextPageToken)

	const totalResults = playlistItems?.data?.pageInfo?.totalResults;
	let numeroDeVueltas = 1;
	const arrVideos = [];
	let sigueBuscandoVideos = true;

	// console.log("length", playlistItems.data.items.length)

	do {
		for (let cur of playlistItems.data.items ) {

			// console.log("cur.snippet?.thumbnails.length", cur.snippet?.thumbnails)
			
			// if (cur.snippet?.thumbnails && 
			// 	Object.keys(cur.snippet?.thumbnails).length === 0 &&
			// 	Object.getPrototypeOf(cur.snippet?.thumbnails)) {
			// 	console.log("video no encontrado")
			// 	return;
			// }

			const obj = cur.snippet?.thumbnails;

			if (!(obj && 
				Object.keys(obj).length === 0 &&
				Object.getPrototypeOf(obj))) {
				
				// TEMPORAL! es mi user quitarlo cuando le ponga el Login
				const user = ObjectId("644697911166745bf35803ab");
				const channelId = cur.snippet.videoOwnerChannelId;
				const originalTitle = cur.snippet.title;
				const originalDescription = cur.snippet.description;
				const videoId = cur.snippet.resourceId.videoId;

				// si cambio de <ReactPlayer> a <iframe> uso el el que dice /embed/
				const videoUrl = 'https://youtu.be/' + videoId;
				// o si mejor pongo eso en el cliente???
				// const videoUrl = 'https://www.youtube.com/embed/' + videoId;
				const channelTitle = cur.snippet.videoOwnerChannelTitle;
				
				// const myTitle = originalTitle;
				const myTitle = "Agrega un Título";
				const myDescription = "";
				const tags = [];
				tags.push(channelTitle);
				tags.push(originalTitle);
		
				let thumbnailUrl = "";
				let thumbnailHeight = 0;
				let thumbnailWidth = 0;
		
				// console.log("cur.snippet?.thumbnails", cur.snippet?.thumbnails)
		
				if (cur.snippet?.thumbnails?.maxres) {
					thumbnailUrl = cur.snippet.thumbnails.maxres.url;
					thumbnailHeight = cur.snippet.thumbnails.maxres.height;
					thumbnailWidth = cur.snippet.thumbnails.maxres.width;
				}
				else if (cur.snippet?.thumbnails?.standard) {
					thumbnailUrl = cur.snippet.thumbnails.standard.url;
					thumbnailHeight = cur.snippet.thumbnails.standard.height;
					thumbnailWidth = cur.snippet.thumbnails.standard.width;
				}
				else if (cur.snippet?.thumbnails?.high) {
					thumbnailUrl = cur.snippet.thumbnails.high.url;
					thumbnailHeight = cur.snippet.thumbnails.high.height;
					thumbnailWidth = cur.snippet.thumbnails.high.width;
				}
				else if (cur.snippet?.thumbnails?.medium) {
					thumbnailUrl = cur.snippet.thumbnails.medium.url;
					thumbnailHeight = cur.snippet.thumbnails.medium.height;
					thumbnailWidth = cur.snippet.thumbnails.medium.width;
				}
				else if (cur.snippet?.thumbnails?.default) {
					thumbnailUrl = cur.snippet.thumbnails.default.url;
					thumbnailHeight = cur.snippet.thumbnails.default.height;
					thumbnailWidth = cur.snippet.thumbnails.default.width;
				}
		

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
		
				const duration = processDuration(videoDuration.data.items[0].contentDetails.duration);
		

				// Obtiene el logo del canal
				const channelLogo = await axios ({
					method: 'GET',
					url: `${YOUTUBE_LINK}/channels?part=snippet&id=${channelId}&key=${process.env.YOUTUBE_API_KEY}`,
					withCredentials: true
				});
				// console.log(channelLogo.data.items[0].snippet.thumbnails);
		
				if (!channelLogo) {
					return next (new AppError ('No se encontró datos sobre el logo del canal', 400));
				}
		
				const profileLogoUrl = channelLogo.data.items[0].snippet.thumbnails.medium.url; 
				const profileLogoWidth = channelLogo.data.items[0].snippet.thumbnails.medium.width;
				const profileLogoHeight = channelLogo.data.items[0].snippet.thumbnails.medium.height; 

		
				arrVideos.push({
					user,
					channelId,
					originalTitle,
					originalDescription,
					videoId,
					videoUrl,
					channelTitle,
					myTitle,
					myDescription,
					tags,
					thumbnailUrl,
					thumbnailHeight,
					thumbnailWidth,
					duration,
					profileLogoUrl, 
					profileLogoWidth,
					profileLogoHeight
				});
			}
		}

		if (playlistItems?.data?.nextPageToken) {

			const tempNextPageToken = playlistItems.data.nextPageToken;

			playlistItems = await axios ( {
				method: 'GET',
				url: `${YOUTUBE_LINK}/playlistItems?part=snippet&playlistId=${youtubePlayList}&key=${process.env.YOUTUBE_API_KEY}&maxResults=${maxResults}&pageToken=${tempNextPageToken}`,
				withCredentials: true
			});
		
		
			if (!playlistItems || playlistItems.data.items.length === 0) {
				return next (new AppError ('No se encontró videos en el Playlist o no existe el Playlist o no tiene acceso al Playlist, verifica si es Público', 400));
			}
	
			console.log(`Avance: ${(maxResults * numeroDeVueltas * 100 / totalResults).toFixed(2)}%`)
			numeroDeVueltas++;

			// console.log("dataItems", playlistItems.data);
			// console.log("playlist total results", playlistItems.data.pageInfo.totalResults)
			// console.log("playlist nextPageToken", playlistItems.data.nextPageToken)
		
			// console.log ("playlistItems.data.items", playlistItems.data.items)
		}
		else
			sigueBuscandoVideos = false;


	} while (sigueBuscandoVideos)

	console.log("Avance: 100% termino de cargar los videos desde Youtube al web server")

	console.log("Termina de sacar la informacion de los videos Y empieza a crear Promises", new Date(Date.now()))
	// console.log("arrVideos", arrVideos)

	const allVideosComplete = Promise.all (arrVideos.map(cur => {
		return GreatVideo.create (cur);
	}));

	console.log("Empieza a grabar en MongoDB", new Date(Date.now()))
	// console.log("allVideosComplete", allVideosComplete);
	const lists = await allVideosComplete;
	// console.log("lists", lists);
	console.log("Termina de grabar en MongoDB", new Date(Date.now()))

	res.status(201).json({
		status: 'success',
		// data: playlistItems	
	});

});