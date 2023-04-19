// Uso extends para usar los objects de esta class que hereden del built-in Error
// de Javascript (NodeJS)

// Este es el Manejador Global de Errores Operacionales
// Esta Class es para CREAR mis propios errores, yo les asigno el mensaje de error
// y el statusCode, y uso esta Class para evitar el DRY (Dont Repeat Yourself)
// ya que estare creando errores en el backend en muchas partes, asi que con esta
// Class me ayuda a no repetir codigo

// Recuerda esta class SOLO genera el mensaje de error y el statusCode
class AppError extends Error {

	// cuando cree una instancia de AppError le tendre que mandar un message
	// y un statusCode
	constructor (message, statusCode) {

		// como es costumbre al extender una parent class uso el super para llamar 
		// al parent constructor y uso message porque es el unico parametro que
		// el built-in error acepta
		super(message);
		this.statusCode = statusCode;

		// this.status puede ser fail o error, si el statusCode es 400 sera fail y si es 500 sera error asi que puedo checar si el statusCode empieza con 4, usando un metodo llamado startsWith que puedo usar en Strings, asi que convierto el statusCode a String hago el chequeo si es 4 con el que empieza 
		this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';

		this.isOperational = true;

		// con esto PERMITO que cuando se genere este error se muestre en el 
		// err.stack
		Error.captureStackTrace(this, this.constructor);
	}
}

module.exports = AppError


///////////////////////////////////////////////////////////////////
// Lecture-115 Better Errors and Refactoring
///////////////////////////////////////////////////////////////////

/*
Todos los errores que creare usando esta clase seran Operational Errors, 
osea errores que puedo predecir que pasen en un momento dado, osea un error
en el que el usuario se equivoque, como capturar mal una Api y para eso usare
una property llamada isOperational

por ejemplo:
	un usuario creando un tour y que le falten required fields

ya que si isOperational es true solo le mandaremos mensajes al client si es true
Esto es util para no mostrarle al client errores como de Programacion o errores que pueden venir de los packages que instalamos

Como ultimo paso necesito capturar el stack trace y que es eso? nos muestra en donde paso el error
	console.log(err.stack);
*/