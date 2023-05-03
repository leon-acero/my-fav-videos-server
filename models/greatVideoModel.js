const mongoose = require('mongoose');
const slugify = require('slugify');

///////////////////////////////////////////////////////////////////
// Modelling The Great Videos
///////////////////////////////////////////////////////////////////

const greatVideoSchema = new mongoose.Schema( 
  { 
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required:[ true, 'El Video debe tener un Usuario.' ]
    },
    
    // trim solo funciona para Strings, quita los white spaces al inicio y 
    // final del String, ejemplo: "  Este Product me gusto porque     "
    myTitle: { 
        type: String,
        required: [true, 'El video debe tener Título'],
        trim: true,
        maxlength: [ 100, 'El Título del video debe ser menor o igual a 100 caracteres.'],
        minlength: [ 5, 'El Título del video debe ser mayor o igual a 5 caracteres.']
    },  

    myDescription: { 
        type: String,
        trim: true,
        maxlength: [ 1000, 'La Descripción del video debe ser menor o igual a 1000 caracteres.'],
    }, 
    
    // Info del Canal
    channelTitle: String, 
    channelId: String,

    // Info del Logo del Canal
    profileLogoUrl: String, 
    profileLogoWidth: Number, 
    profileLogoHeight: Number, 

    // Info del Video
    videoId: String, 
    videoUrl: String, 
    originalTitle: String, 
    originalDescription: String, 
    duration: String, 

    // Info del Thumbnail del Video
    thumbnailUrl: String, 
    thumbnailWidth: Number, 
    thumbnailHeight: Number, 

    // Tags de Busqueda del video
    tags: [String],
    
    slug: String,

    // Es un timestamp en milisegundos que se configura en el momento en el que 
    // el usuario obtiene un nuevo Product, esto se hace en automatico en el 
    // momento que un Product es creado, pero en mongoose se guarda como una fecha normal
    createdAt: {
        type: Date,
        default: Date.now(),
        select: false
    },   
}, 
  { 
    toJSON: { virtuals: true } ,  
    toObject: { virtuals: true } 
});

// Creo un indice para hacer mas eficientes las búsquedas
greatVideoSchema.index( { user: 1, tags: 1 } );

greatVideoSchema.pre('save', function(next) {
  
//   this.slug = slugify(this.myTitle, { lower: true });

  next();
});


const GreatVideo = mongoose.model('GreatVideo', greatVideoSchema)

module.exports = GreatVideo;