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