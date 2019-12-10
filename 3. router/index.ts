import express from 'express'
import { auth, data, user } from '../2. control'
import upload from '../4. multer'

export let authRouter = express.Router();
export let userRouter = express.Router();
export let dataRouter = express.Router();
export let uploadRouter = express.Router();

authRouter.post( '/login' , auth.login)
authRouter.post( '/gettoken' , auth.newToken )
authRouter.post( '/verifytoken' , auth.verifyToken )
authRouter.post( '/refreshtoken' , auth.refreshToken )

userRouter.post( '/register' , user.create)
userRouter.post( '/transaction' , user.create)
userRouter.post( '/update' , user.update)
userRouter.get( '/get' , user.read)
userRouter.delete( '/delete' , user.delete)

dataRouter.get( '/get', data.read )
dataRouter.post( '/insert', data.create )
dataRouter.delete( '/delete', data.delete )
dataRouter.post( '/update', data.update )

uploadRouter.post( '/thumbnail', upload.thumbnail.single('thumbnail'), ( req:any, res ) => res.send(req.file.filename))
uploadRouter.post( '/music', upload.music.single('music'), ( req:any, res ) => res.send(req.file.filename))
uploadRouter.post( '/payment', upload.payment.single('payment'), ( req:any, res ) => res.send(req.file.filename))