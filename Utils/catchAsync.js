///////////////////////////////////////////////////////////////////
// Lecture-116 BCatching Errors in Async Functions
///////////////////////////////////////////////////////////////////
/*
Esta es una function que maneja Async Functions en el body de esta function
*/

/*
Esta es una Async function que ejecuta un Middleware por lo tanto en automatico
el Global Error Handling Middleware se encarga en caso de que haya un error
*/

/*
Esta es una function que envuelve a otra function
osea a catchAsync le mandare como parametro una function
este catchAsync solo usa en Async Functions y recuerda que estas regresan
Promises y cuando hay un error en una Async Function significa que la Promise
es rechazada y entonces podemos hacerle .catch al error como se ve aqui, y asi
es como me quito del try-catch block 
*/
module.exports = fn => 

	// la razon de usar return es para que se regrese la function SIN ejecutar
	// es decir que espere sentadita hasta que la llamen, de lo contrario
	// se mandaria ejecutar inmediatamente y NO quiero eso
	// ademas de NO hacerlo asi, esta function no tendria idea de que viene siendo
	// req, res, next porque seria llamada en automatico, NO como resultado
	// de que un usuario haya dado click a una route y por ende le mande los datos
	// de req, res, next
	 (req, res, next) => {
		// estas dos lineas son identicas
		// fn(req, res, next).catch(err => next(err));	
		fn (req, res, next).catch(next);	

		/*
		el .catch(next) si hay error manda llamar al Global Handling Error es
		decir al errorController.js y porque?? porque catchAsync lo uso SOLO en
		Middlewares y errorController.js se encarga de checar errores en Middlewares, asi que cuando le doy .catch(next) en automatico se ejecuta
		errorController.js

		Y es por eso que errorController.js lo declaro en app.js y asi esta
		disponible en todos los routes, los cuales estan disponibles en todos
		los Controllers
		*/
	}
;

/*
module.exports = fn => {

	// la razon de usar return es para que se regrese la function SIN ejecutar
	// es decir que espere sentadita hasta que la llamen, de lo contrario
	// se mandaria ejecutar inmediatamente y NO quiero eso
	// ademas de NO hacerlo asi, esta function no tendria idea de que viene siendo
	// req, res, next porque seria llamada en automatico, NO como resultado
	// de que un usuario haya dado click a una route y por ende le mande los datos
	// de req, res, next
	return (req, res, next) => {
		// estas dos lineas son identicas
		// fn(req, res, next).catch(err => next(err));	
		fn (req, res, next).catch(next);	

	};
};
*/