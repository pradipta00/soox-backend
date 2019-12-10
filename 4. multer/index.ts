import multer from 'multer';

let storageConfig = {
    music : multer.diskStorage({
        destination : ( _, __, cb ) => {
            cb(null, './5. files/music')
        },
        filename : (req, file, cb) => {
            cb( null , `Music-${Date.now()}.mp3` )
        }
    }),

    thumbnail : multer.diskStorage({
        destination : ( _, __, cb ) => {
            cb(null, './5. files/thumbnails')
        },
        filename : (req, file, cb) => {
            cb( null , `Thumb-${Date.now()}.jpg` )
        }
    }),
    
    payment : multer.diskStorage({
        destination : ( _, __, cb ) => {
            cb(null, './5. files/payment')
        },
        filename : (req, file, cb) => {
            cb( null , `Payment-${Date.now()}.jpg` )
        }
    }),
}

let upload = {
    music : multer({storage : storageConfig.music}),
    thumbnail : multer({storage : storageConfig.thumbnail}),
    payment : multer({storage : storageConfig.payment})
}

export default upload;