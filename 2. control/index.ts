import db from '../1. database'
import jwt from 'jsonwebtoken'
import moment from 'moment'
import crypto from 'crypto'
import { MysqlError } from 'mysql'

const secretKey:string = '0Vg9!XC*p^'
const expiredDuration:string = '1h'
const createHash = (e:string):string => ( crypto.createHmac('sha256', secretKey).update(e).digest('base64') )

interface res { send: Function, status?: Function }

interface auth {
    login: ( _:{ body:{ Username:string, Password:string } }, __:res ) => void,
    newToken: ( _:{ body:{} }, __:res ) => void,
    verifyToken: ( _:{ headers:{} } , __:res ) => void,
    refreshToken: ( _:{ headers:{} } , __:res ) => void,
}

interface user {
    read : ( _:{ query:{ table:string, id:number } }, __:res ) => void,
    create : ( _:{ body:{ Username:string, Password:string, Email:string, Fullname:string, userId:number, files:string, type:string, table:string } }, __:res ) => void,
    update : ( _:{ body:{ id:number, table:string, type:string, userId:number } }, __:res ) => void,
    delete : ( _:{ query: { id:number, table:string } }, __:res ) => void
}

interface data {
    read : (_:{ query:{ id:number, table:string, albumId:number } }, __:res ) => void
}

const auth:auth = 
    {
        login : ( { body } , res) => {
            let username = body.Username || '',
                password = body.Password || '',
                hashed:string = createHash(password),
                query:string = `SELECT * FROM users WHERE username = ${username}`

            if ( username.match( /[@]{1}[\w\d]+[\.]/g ) ) query = `SELECT * FROM users WHERE email = ${username}`

            db.query( query, (err:{}, response:[{ password:string }]) => {

                if (err) console.error(err)

                if ( response.length && response[0].password === hashed ) res.send({ logged : true, ...response[0] })
                else res.send({ logged : false })

            })
        },

        newToken : ( { body }, res ) => {
            let token = jwt.sign( body, secretKey, { expiresIn : expiredDuration } )
                
            res.send(token)
        },
        
        verifyToken : ( { headers }:any, res ) => {
            jwt.verify( headers.authorization, secretKey, (err:any, decoded:any) => {
                if (err) res.send({ error : true, message : 'User Not Authorized' })
                else res.send(decoded)
            })
        },

        refreshToken : ( { headers }:any, res ) => {
            jwt.verify( headers.authorization, secretKey, (err:any, decoded:{ id:number } ) => {
                if (err) 
                    res.send({ error : true, message : 'User Not Authorized' })
                
                let query = `SELECT * FROM users WHERE id = ${decoded.id}`
                db.query( query, ( err, response:[{ password:string }] ) => {

                    if (err) console.error(err)
                    delete response[0].password

                    res.send([
                        response[0],
                        jwt.sign( {...response[0]}, secretKey, { expiresIn : expiredDuration } )
                    ])
                })
            })
        },
    }