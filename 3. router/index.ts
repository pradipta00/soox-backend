import express from 'express'
// import { auth } from '../2. control'

export let authRouter = express.Router();
export let dataRouter = express.Router();
export let uploadRouter = express.Router();

authRouter.get('/', (req, res) => {
    console.log(req.body)
    res.send('Manthoel')
})
authRouter.get('/test', (req, res) => {
    console.log(req.body)
    res.send('Manthoel ini test')
})

// dataRouter.post('/gettoken', auth.newToken)
// dataRouter.get('/verifytoken', auth.verifyToken)
// dataRouter.get('/refreshtoken', auth.refreshToken)