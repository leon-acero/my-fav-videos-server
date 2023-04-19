// 3rd Party 
const crypto = require ('crypto');
const { promisify } = require ('util');
const jwt = require ('jsonwebtoken');

// Models
const User = require('../models/userModel');

// Utils
const catchAsync = require('../Utils/catchAsync');
const AppError = require('../Utils/appError');
const Email = require ('../Utils/email');


///////////////////////////////////////////////////////////////////
// Local Functions

///////////////////////////////////////////////////////////////////
// signToken
const signToken = userId => jwt.sign ( 
			{ id: userId  }, 
		  	process.env.JWT_SECRET, 
			{ expiresIn: process.env.JWT_EXPIRES_IN }
	)


///////////////////////////////////////////////////////////////////
// createSendToken

const createSendToken = (user, statusCode, req, res, problemWithEmail = false) => {

	const token = signToken (user._id);

	// console.log('createSendToken');
	// console.log('token', token);

	// Creo la cookie que se mandará al Client
	if(process.env.NODE_ENV === 'production') { 
		res.cookie('jwt', token, { 
			expires: new Date(Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000),
			httpOnly: true,
			sameSite: 'None',
			secure: req.secure || req.headers ['x-forwarded-proto'] === 'https'
		});
	}
	else if(process.env.NODE_ENV === 'development') {
		// console.log("development")
		res.cookie('jwt', token, { 
			expires: new Date(Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000),
			httpOnly: true,
			// sameSite: 'None',
		});
	}

	// con esto ya NO manda de regreso el password ni el email al Client
	user.password = undefined;
	user.email = undefined;

	// asi es como se crea un token, ahora solo falta mandarlo al Client, es todo 
	// lo que tengo que hacer para loggear a un nuevo User, porque en este momento
	// no estoy checando si el password es correcto o si el User existe en la DB
	// porque en este caso el User acaba de ser creado asi que de inmediato 
	// loggeo al User a la App al enviar un token y el Client del User debe de 
	// guardar este token

	// console.log('cookie');
	// luego mando este nuevo User al Client
	res.status(statusCode).json({
		status: 'success',
		token,
		problemWithEmail: problemWithEmail,
		data: {
			user
		}
	});
}

///////////////////////////////////////////////////////////////////
// Middlewares

///////////////////////////////////////////////////////////////////
// signup
exports.signup = catchAsync( async (req, res, next) => {
	
	// Creo la informacion del nuevo usuario a partir del req.body
	// y aqui mismo creo el Document en MongoDB en la collection Users
	const newUser = await User.create ({
		name: req.body.name,
		email: req.body.email,
		password: req.body.password,
		confirmPassword: req.body.confirmPassword,
		passwordChangedAt: req.body.passwordChangedAt,
		role: req.body.role
	});

	// Creo el url que ira en el Email
	const url = `${req.protocol}://${req.get('host')}/me`;

	// Mando el Email de Bienvenida al Usuario
	let problemWithEmail = true;

	// Si todo salio Bien al Mandar el Email entonces problemWithEmail = false;
	if (await new Email (newUser, url).sendWelcome())
		problemWithEmail = false;
		
	// Creo el token que mandare de regreso al Client
	createSendToken (newUser, 201, req, res, problemWithEmail);

});



///////////////////////////////////////////////////////////////////
// login
exports.login =  catchAsync (async (req, res, next) => {

	// Obtengo el email y password para loggear al usuario usando req.body
	const { email, password } = req.body;

	// asi es como el User manda los login credentials para que los chequemos
	// ese chequeo tiene un par de pasos

	// 1. Checar si email y password fueron capturados por el usuario
	if (!email || !password) {
		// si no existen mandar un mensaje de error al Client, usando AppError 
		// para que el Global Handling Middleware mande el error al Client
		return next (new AppError ('Por favor captura el correo electrónico y/o password', 400));		
	}
		

	// 2. Checar si el User existe  && si el password son correctos segun lo que
	// haya en la BD uso findOne por que no busco el User por su Id si no por el email

	// Busco en la Collection de Users en MongoDB si el email existe
	// si es asi, me traigo el password
	const userDocument = await User.findOne( { email } ).select('+password');

	// si no existe el User o el password es invalido
	// status 401 es unauthorized
	// password = passwordCapturadoPorElUsuario en la pagina de Login
	// userDocument.password = el password guardado en MongoDB de ese Email
	if (!userDocument || !(await userDocument.correctPassword (password, userDocument.password))) {
		// console.log("El email o el password son incorrectos")
		return next ( new AppError ('El email o el password son incorrectos.', 401));
	}

	// 3. Si todo esta bien enviar el JSON Web Token al Client
	// cuando hago login NO mando Email
	createSendToken (userDocument, 200, req, res);
});



///////////////////////////////////////////////////////////////////
// protect
exports.protect = catchAsync(async (req, res, next) => {

	// 1. Get the JWT(token) and check if it’s there, if it exists in the Headers
	let token;

	if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
		// para obtener el token que esta despues de Bearer hago un .split usando 
		// el espacio entre ellos como separador, y se creara un Array
		token = req.headers.authorization.split(' ')[1];
	}

	else if (req.cookies.jwt && req.cookies.jwt !== 'loggedout') {
		token = req.cookies.jwt; 
	}

	// Y EN EFECTO SI ME REGRESA el Token

	// Ahora checo el si Token que me llega del Client en verdad Existe
	if (!token) {
		// 401 unauthorized
		return next (new AppError('No has iniciado sesión. Por favor inicia sesión para tener acceso.', 401));
	}

	const decodedData =  await promisify(jwt.verify)(token, process.env.JWT_SECRET);


	// 3. Check if the User who’s trying to access the Route still exists
	const currentUser = await User.findById(decodedData.id);

	if (!currentUser) {
		return next (new AppError('The User belonging to this token does no longer exists', 401));
	}

	
	if (currentUser.changedPasswordAfter(decodedData.iat)) {
		return next (new AppError('User recently changed password! Please log in again', 401));
	}


	// Poner el User data en el request y luego doy Acceso
	req.user = currentUser;

	res.locals.user = currentUser;


	// Solo si NO hubo problemas en los pasos previos se llamara a next() lo cual 
	// dara acceso a la Protected Route
	next();

});




// aqui va IMPLICITO el return asi que no necesito ponerlo
// ya que es una solo linea, al igual los {} NO se necesitan
///////////////////////////////////////////////////////////////////
// restrictTo
exports.restrictTo = ( ...roles) => 

	// y en seguida regreso una funcion nueva y esta es la Middleware function
	// y esta Middleware function tiene acceso al roles parameter porque es un CLOSURE
	// aqui se sobre entiende que dice return (req, res, next) => {..... }
	 (req, res, next) => {

		// console.log("req.user", req.user);
		if (!roles.includes(req.user.role)) {
			// statusCode 403 Forbidden, no Authorized
			return next (new AppError ('No tienes permiso o el rol para realizar esta acción.', 403));
		}
		next();
	}


///////////////////////////////////////////////////////////////////
// forgotPassword
// Aqui envia el Email con el url para resetear el password
exports.forgotPassword =  catchAsync( async (req, res, next) => {

	// 1. Get user based on POSTed email
	const { email, urlEncoded } = req.body;

	// const user = await User.findOne( { email: req.body.email } );
	// Uso findOne no findById porque no conozco el User Id y el usuario tampoco 
	// sabe su Id 
	const user = await User.findOne( { email: email } );

	// Verifico si el User se encontró
	if (!user) {
		// 404 statusCode Not Found
		return next ( new AppError('No existe un usuario con ese correo electrónico.', 404 ) );
	}

	// 2. Generate the random token
	// para esto necesito un Instanced method en userModel.js
	// esta linea modifica el Schema: passwordResetExpires y passwordResetTOken
	// falta grabarlo en la BD 
	const resetToken = user.createPasswordResetToken();	

	await user.save( { validateBeforeSave: false } );

	try {
		// Este es el link de la pagina de Reset Password que se manda al correo
		// del Usuario, la página es de ReactJS y como necesito el URL, viene en
		// urlEncoded
		const resetURL = `${urlEncoded}/reset-password/${resetToken}`;
		// const resetURL = `${req.protocol}://${req.get('host')}/resetPasswordForm`;

		// console.log('resetURL', resetURL);
		let problemWithEmail = true;

		// Si todo salio Bien al Mandar el Email entonces problemWithEmail = false;
		if (await new Email (user, resetURL).sendPasswordReset())
		{
			problemWithEmail = false;
		}


		let message = "";

		if (problemWithEmail)
			message = "Hubo un error al enviar el token al correo electrónico"
		else
			message = "El token fue enviado al correo electrónico"

		// NO DEBO ENVIAR EL TOKEN POR AQUI osea dentro de JSON, sino cualquiera podria darle reset al password de cualquiera y controlar la cuenta, 
		// para eso mande el email con el token SIN encriptar 

		res.status(200).json({
			status: 'success',
			// message: 'Token sent to email',
			message,
			problemWithEmail: problemWithEmail
		});
	} 
	catch (err) {

		// console.log('err', err);
		// hago el set back
		user.passwordResetToken = undefined;
		user.passwordResetExpires = undefined;

		// lo guardo en la BD
		await user.save( { validateBeforeSave: false } );

		// el statusCode es 500 porque es un error en el server
		return next (new AppError ('Hubo un error al enviar el correo electrónico. Vuelva a intentar más tarde', 500));
	}
});



///////////////////////////////////////////////////////////////////
// resetPassword
// Aqui se hace el cambio de password en la MongoDB
exports.resetPassword =  catchAsync( async (req, res, next) => {

	// 1. Get User based on the token
	// Obtengo el resetToken
	const hashedResetToken = crypto.createHash('sha256').update(req.params.resetToken).digest('hex');


	// Busco el passwordResetToken en la Collection de Users
	const user = await User.findOne( { passwordResetToken: hashedResetToken, passwordResetExpires: { $gt: Date.now() } } );


	// 2. If token has not expired && there is a user : set the New Password
	// Mando un error si no se encontro el User o si el reset Token expiró
	if (!user) {
		return next (new AppError ('El Token es inválido o ha expirado' ,400));
	}

	// Si llego hasta aqui todo va bien, hago el cambio de password
	user.password = req.body.password;
	user.confirmPassword = req.body.confirmPassword;

	user.passwordResetToken = undefined;
	user.passwordResetExpires = undefined;

	// Grabo el nuevo password en la Collection de Users
	await user.save();

	// 3. Update passwordChangedAt property for the current User

	// 4. Log in the User, send the JWT to the Client 
	// Envio el JSON Web Token al Client  y puedo usar un cpdigo que ya tengo

	const token = signToken (user._id);

	// luego mando este nuevo User al Client
	res.status(201).json({
		status: 'success',
		token,
		data: {
			user
		}
	});
});



///////////////////////////////////////////////////////////////////
// updateMyPassword
// Este middleware se usa cuando el Usuario actualizo el password
// desde una página
exports.updateMyPassword = catchAsync (async (req, res, next) => {

	// 1. Get User from the collection Users
	// Uso el id del usuario que pidio cambiar su password desde dentro
	// de la pagina, es decir, esta loggeado y obtengo el password
	// guardado en la MongoDB
	const user = await User.findById( req.user.id ).select('+password');
	
	// Si encuentro al Usuario en la MongoDB, ahora checo si el password
	// capturado por el usuario en la pagina coincide con el password
	// que esta guardado en MongoDB
	if (!user || !(await user.correctPassword (req.body.oldPassword, user.password))) {
		return next (new AppError('Tu password actual esta equivocado.', 404));
	}

	// SI llego hasta aqui Todo va bien y hago el cambio de password 
	// 2. Check if the POSTed password is correct
	user.password = req.body.newPassword;
	user.confirmPassword = req.body.confirmNewPassword;

	// 3. If so, Update the Password in the DB
	// Actualizo el password en la MongoDB
	await user.save();

	// 4. Log in the User again, send JWT to the User
	// Vuelvo a loggear el User y mando el nuevo JWT y actualizo passwordChangedAt 
	createSendToken (user, 200, req, res);

});



///////////////////////////////////////////////////////////////////
// logout
exports.logout = (req, res, next) => {
	
	// el secreto es darle a esta cookie el mismo nombre que cuando me loggeo, ‘jwt’


	if(process.env.NODE_ENV === 'production') { 
		res.cookie ('jwt', 'loggedout', 
			{ 
				// cambie de 10segundos a 1 segundo
				// expires: new Date( Date.now() + 1 * 1000),
				// ahora lo cambie a CERO segundos
				expires: new Date(0),
				httpOnly: true,
				sameSite: 'None',
				secure: req.secure || req.headers ['x-forwarded-proto'] === 'https'
			});	
	}

	if(process.env.NODE_ENV === 'development') { 
		res.cookie ('jwt', 'loggedout', 
			{ 
				// cambie de 10segundos a 1 segundo
				// expires: new Date( Date.now() + 1 * 1000),
				// ahora lo cambie a CERO segundos
				expires: new Date(0),
				httpOnly: true,
			});
	}
	
	res.status(200).json({ status: 'success' });
}



// ESTE CODIGO ES MUY IMPORTANTE!
// Me ayuda a que si doy log out a un User y luego le doy para atras en el Browser
// No me cargue una pagina que estaba viendo cuando estaba Log in!!!!
// Era un bug muy severo
///////////////////////////////////////////////////////////////////
// controllCacheHeader
// Este metodo solo lo use en el otro proyecto que NO era de React ya que
// las paginas se mandaban desde el server cada vez que el usuario daba 
// regresar hacia atras o adelante en el browser y mandaba el cache para
// pintar la pagina, esto NO lo permito ya que el usuario pudiera estar
// desloggeado y con esto no permito que un usuario desloggeado pueda ver
// el cache de la pagina, SIEMPRE checo que el usuario este loggeado antes
// de mandar una pagina desde el server

exports.controllCacheHeader = (req, res, next) => {
	res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate'); 
	res.setHeader('Pragma', 'no-cache'); 
	res.setHeader('Expires', '0');
	next();
};


///////////////////////////////////////////////////////////////////
// isLoggedIn
// Este metodo solo lo use en el otro proyecto que NO era de React ya que
// las paginas se mandaban desde el server cada vez que el usuario daba click
// a un boton o a una liga, por lo que siempre tenia que checar si el usuario
// estaba loggeado para ver si le mandaba la pagina o no
exports.isLoggedIn = async (req, res, next) => {

	// 1. Get the JWT(token) and check if it’s there, if it exists in the Headers

	// El token debe venir de una cookie y NO de un Authorization header porque 
	// para paginas pintadas NO tendremos el token en el header

	if (req.cookies.jwt) {
		try {
			// 1. Verification of the token, JWT algorithm verifies if the signature is valid
			const decodedData =  await promisify(jwt.verify)(req.cookies.jwt, process.env.JWT_SECRET);


			// 2. Check if the User who’s trying to access the Route still exists
			const currentUser = await User.findById(decodedData.id);

			if (!currentUser) {
				return next ();
			}

			// 3. Check if the User changed the password after the JWT(token) was issued	
			if (currentUser.changedPasswordAfter(decodedData.iat)) {
				return next ();
			}

			res.locals.user = currentUser;

			return next();
		}
		catch(err) {
			return next();
		}
	}

	next();
};
