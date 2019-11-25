import express from "express"
import cors from 'cors'
import bodyParser from 'body-parser'

const app = express();
const port = 8080;

app.use(cors());
app.use(bodyParser());

app.use('/music', express.static('5. files/music'))
app.use('/payment', express.static('5. files/payment'))
app.use('/thumbnails', express.static('5. files/thumbnails'))

app.listen( port, _ => console.log( `Server running on => http://localhost:${ port }` ));