import db from '../1. database'
import jwt from 'jsonwebtoken'
import moment from 'moment'
import fs from 'fs'
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
    read : (_:{ query:{ id:number, table:string, albumId:number } }, __:res ) => void,
    create : ( _:{ body : { title:string, filename:string, thumbnail:string, albumId:number, musicId:number, artistId:number, genreId:number, userId:number, date:any, table:string, value:string } }, __:res ) => void,
    delete : ( _:{ query:{ id:number, table:string, filename:string, thumbnail:string, music:string } }, __:res ) => void
    update : ( _:{ body:{ table:string, filename:string, thumbnail:string, title:string, albumId:string, id:string } } , __:res ) => void
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

const user:user =
    {
        read : ( req, res ) => {
            let { table, id='userId' } = req.query, query;

            switch (table) {
                case 'users':
                    query = 'SELECT * FROM users'
                    break;
                case 'transaction':
                    query = 'SELECT * FROM transaction'
                    break;
                case 'limit':
                    query = `SELECT count(*) as total FROM views WHERE userId = ${id} GROUP BY DATE(date) ORDER BY date DESC LIMIT 1`
                    break;
                case 'transactionCount':
                    query = `SELECT count(*) as Transaction, month(date) as Month FROM transaction GROUP BY month(date) ORDER BY Month`
                    break;
                case 'usersCount':
                    query = `SELECT count(*) as Total, Roles FROM users GROUP BY roles`
                    break;
                case 'dailyViews':
                    query = `SELECT count(*) AS Total, day(date) as Date FROM views WHERE month(date) = ${new Date().getMonth() + 1} GROUP BY day(date) ORDER BY Date`
                    break;
                case 'monthlyViews':
                    query = 'SELECT count(*) AS Total, month(date) as Month FROM views GROUP BY month(date) ORDER BY month'
                    break;
                default: break;
            }

            if (query) 
                db.query( query, (err, response) => {
                    if (err) console.error(err);
                    res.send(response)
                })
            else
                res.send({ error: true, message: "Table is unrecognized/forbidden" })
        },
        create : ( req, res ) => {
            let { Username, Password, Email, Fullname, userId, files, type, table } = req.body, sendMessage:{} ;
            switch (table) {
                case 'transaction':
                    db.query( `INSERT INTO transaction VALUES (null, ${userId}, '${files}', '${type}', '${moment().format("YYYY-MM-DD HH:mm:ss")}', 0)`,
                        (err, _:never) => {
                            if (err) throw err
                            else 
                                db.query( `UPDATE users SET roles = 'pending' WHERE id = ${userId}`, (err, response) => {
                                    if (err) throw err
                                    else sendMessage = response[0]
                                })
                        })
                    break;
                case 'users':
                    // Check for existing users
                    db.query( `SELECT * FROM users WHERE username = ${Username} OR email = ${Email}`, ( err, exist ) => {
                        if (err) 
                            throw err
                        else if ( exist.length && exist[0].username === Username ) 
                            sendMessage = { success : false, error: 'username' }
                        else if ( exist.length && exist[0].email === Email ) 
                            sendMessage = { success : false, error : 'email' }
                        else
                            db.query( `INSERT INTO users VALUES ( null, '${Username}', '${createHash(Password)}', '${Email}', '${Fullname}' , 'rakyat', 0)`, 
                                (err, _:never) => {
                                    if (err) throw err
                                    else sendMessage = { success : true }
                                })
                    })
                    break;
                default: break;
            }
            res.send(sendMessage)
        },
        update : async ( { body }, res ) => {
            let { id, table, type, userId } = body, error:MysqlError[];

            switch (table) {
                case 'transaction':
                    await db.query(`UPDATE users SET roles = "pejabat", premiumend = "${moment().add(1, type==='month' ? 'M' : 'y').format('YYYY-MM-DD HH:mm:ss')}" WHERE id = ${userId}`,
                        (err, _:never) => {
                            if (err) error.push(err)
                        })
                    await db.query(`UPDATE transaction SET approved = 1 WHERE id = ${id}`, 
                        (err, _:never) => {
                            if (err) error.push(err)
                        })
                    break;
                case 'premiumend':
                    db.query( `UPDATE users SET roles = 'rakyat' WHERE id = ${id}`, (err, _:never) => {
                        if (err) error.push(err)
                    })
                default:
                    return res.send({ error : true, message:'Table is unrecognized' })
            }

            if (error.length) res.send({ error : true, message : error })
            else res.send({ error: false, message : 'Operation succeed' })
        },
        delete : ( req, res ) => {
            let { id, table } = req.query, query:string;

            if ( table === `users` ) query = `DELETE FROM users WHERE id = ${id}`
            else if ( table === 'transaction' ) query = `DELETE FROM transaction WHERE id = ${id}`
            else return res.send({ error : true, message : 'Table unrecognized' })

            db.query( query, (err, response) => {
                if ( err ) throw err;
                res.send( response )
            })
        }
    }

const data:data =
    {
        read : ( req, res ) => {
            let { id = '', table, albumId } = req.query,
                sendResponse = ( err:MysqlError, response:any ) => { if (err) {throw err} else res.send(response) }

            switch (table) {
                case 'music':
                case 'artist':
                case 'album':
                case 'genre':
                    db.query( `SELECT * FROM ${table} WHERE id = ${id}`, sendResponse)
                    break;        
                case 'conn_music_genre':
                    db.query( `SELECT C.*, music.title, genre.name FROM music, genre, conn_music_genre as C WHERE C.genreId = genre.id AND C.musicId = music.id`, sendResponse)
                    break;
                case 'conn_music_artist':
                    db.query( `SELECT C.*, music.title, artist.name FROM music, artist, conn_music_artist as C WHERE C.artistId = artist.id AND C.musicId = music.id`, sendResponse)
                    break;
    
                case 'music_album':
                    db.query( 'SELECT music.*, album.name AS Album FROM music, album WHERE music.albumId = album.id', sendResponse)
                    break;
                case 'latest_album_thumbnail':
                    db.query( 'SELECT album.*, music.thumbnail FROM album, music WHERE music.albumId = album.id GROUP BY album.id ORDER BY id DESC LIMIT 10', sendResponse)
                    break;
                case 'random_album_thumbnail':
                    db.query( 'SELECT album.*, music.thumbnail FROM album, music WHERE music.albumId = album.id GROUP BY album.id ORDER BY RAND() LIMIT 10', sendResponse)
                    break;
                case 'most_album_thumbnail':
                    db.query( 'SELECT count(*) as total, music.thumbnail, album.* FROM views, music, album WHERE music.id = views.musicId AND album.id = music.albumId GROUP BY albumId ORDER BY total DESC LIMIT 10', sendResponse)
                    break;
    
                case 'music_artist':
                    db.query( `SELECT music.*, artist.name AS artist_name FROM music, artist, conn_music_artist AS C WHERE music.id = c.musicId AND artist.id = c.artistId ${albumId ? 'AND albumId = ' + albumId : ''} GROUP BY music.id`, sendResponse)
                    break;
                case 'latest_music_artist':
                    db.query( 'SELECT music.*, artist.name AS artist_name FROM music, artist, conn_music_artist AS C WHERE music.id = c.musicId AND artist.id = c.artistId GROUP BY music.id ORDER BY id DESC LIMIT 10', sendResponse)
                    break;
                case 'most_music_artist':
                    db.query( 'SELECT count(*) as total, music.*, artist.name AS artist_name FROM views, music, artist, conn_music_artist as C WHERE music.id = views.musicId AND music.id = C.musicId AND artist.id = C.artistId GROUP BY views.musicId ORDER BY total DESC LIMIT 10', sendResponse)
                    break;
                case 'least_music_artist':
                    db.query( `SELECT music.*, artist.name AS artist_name FROM music, artist, conn_music_artist AS C WHERE music.id NOT IN (SELECT musicId FROM views) AND music.id = C.musicId AND artist.id = C.artistId GROUP BY music.id UNION ALL
                    (SELECT music.*, artist.name as artist_name FROM views, music, artist, conn_music_artist as C WHERE music.id = views.musicId AND music.id = C.musicId AND artist.id = C.artistId GROUP BY views.musicId ORDER BY count(*) ASC LIMIT 10) LIMIT 10`, sendResponse)
                    break;
                case 'most_music_artist_today':
                    db.query( `SELECT count(*) as total, music.*, artist.name AS artist_name FROM views, music, artist, conn_music_artist as C WHERE date BETWEEN '${moment(new Date()).format('YYYY-MM-DD 00:00:00')}' AND '${moment(new Date()).format('YYYY-MM-DD 23:59:59')}' AND music.id = views.musicId AND music.id = C.musicId AND artist.id = C.artistId GROUP BY views.musicId ORDER BY total DESC LIMIT 10`, sendResponse)
                    break;
                case 'most_music_artist_month':
                    db.query( `SELECT count(*) as total, music.*, artist.name AS artist_name FROM views, music, artist, conn_music_artist as C WHERE date BETWEEN '${moment(new Date()).format('YYYY-MM-00 00:00:00')}' AND '${moment(new Date()).format('YYYY-MM-30 23:59:59')}' AND music.id = views.musicId AND music.id = C.musicId AND artist.id = C.artistId GROUP BY views.musicId ORDER BY total DESC LIMIT 10`, sendResponse)
                    break;
                case 'music_artist_user':
                    db.query( `SELECT music.*, artist.name AS artist_name FROM music, artist, conn_music_artist AS C WHERE music.id = c.musicId AND artist.id = c.artistId AND music.id IN (SELECT musicId FROM views WHERE userId = ${id} GROUP BY musicId ORDER BY date DESC) GROUP BY music.id LIMIT 10`, sendResponse)
                    break;
    
                case 'music_genre':
                    db.query( `SELECT music.*, artist.name AS artist_name from music, genre, conn_music_genre as C, conn_music_artist as CC, artist WHERE music.id = C.musicId AND genre.id = C.genreId AND CC.musicId = music.id AND artist.id = CC.artistId AND genre.id = ${id} GROUP BY music.id`, sendResponse)
                    break;
                case 'most_music_genre':
                    db.query( 'SELECT count(*) as total, genre.* FROM music, views, genre, conn_music_genre as C WHERE music.id = views.musicId AND music.id = C.musicId AND genre.id = C.genreId GROUP BY genre.id', sendResponse)
                    break;
    
                default:
                    res.status(403);
                    res.send(`Forbidden. ${table} is not allowed.`)
                    break;
            }
        },

        create : ( {body}, res ) => {
            let { title, filename, thumbnail, albumId, musicId, artistId, genreId, userId, date, table, value } = body,
                query:string,
                response = ( err:MysqlError, response:any ) => { if (err) throw err; res.send(response) };

            switch (table) {
                case 'album':
                case 'artist':
                case 'genre':
                    query =`INSERT INTO ${table} VALUES (null, "${value}")`;
                    break;
                case 'music':
                    query = `INSERT INTO music VALUES (null , "${title}", "${filename}", "${thumbnail}", "${albumId}")`
                    response = ( err, success ) => {
                        if (err) {res.send({ ...err, ok : false }); console.trace(err)}
                        else res.send({...success, ok : true})
                    }
                    break;
                case 'conn_music_artist':
                    query = `INSERT INTO conn_music_artist VALUES (${musicId}, ${artistId})`
                    break;
                case 'conn_music_genre':
                    query = `INSERT INTO conn_music_genre VALUES (${musicId}, ${genreId})`
                    break;
                case 'views' : 
                    query = `INSERT INTO views VALUES ( ${musicId}, ${userId}, '${date}' )`
                    break;
                default:
                    response = _ => { res.status(403);res.send('Forbidden. The table you intend to modify is forbidden.') }
                    break;
            }

            db.query(query, response)
        },

        delete : ( req, res ) => {
            let { id, table, filename, thumbnail, music } = req.query,
                query:string[],
                error:MysqlError[],
                result:any[]
            
            switch (table) {
                case 'Artist':
                    query.push(`DELETE FROM conn_music_artist WHERE artistId = ${id}`)
                    query.push(`DELETE FROM artist WHERE id = ${id}`)
                    break;
                case 'Genre' :
                    query.push(`DELETE FROM conn_music_genre WHERE genreId = ${id}`)
                    query.push(`DELETE FROM genre WHERE id = ${id}`)
                    break;
                case 'Album' :
                    query.push(`UPDATE music SET albumId = -1 WHERE albumId = ${id}`)
                    query.push(`DELETE FROM album WHERE id = ${id}`)
                    break;
                case 'conn_music_artist':
                    query.push(`DELETE FROM conn_music_artist WHERE musicId = ${id[0]} AND artistId = ${id[1]}`)
                    break;
                case 'conn_music_genre':
                    query.push(`DELETE FROM conn_music_genre WHERE musicId = ${id[0]} AND genreId = ${id[1]}`)
                    break;
                case 'music':
                    query.push(`DELETE FROM conn_music_artist WHERE musicId = ${id}`)
                    query.push(`DELETE FROM conn_music_genre WHERE musicId = ${id}`)
                    query.push(`DELETE FROM music WHERE id = ${id}`)
                    fs.unlinkSync(`thumbnails/${thumbnail}`)
                    fs.unlinkSync(`music/${music}`)
                    break;
                case 'file':
                    if (thumbnail) fs.unlinkSync(`thumbnails/${thumbnail}`);
                    if (filename) fs.unlinkSync(`music/${filename}`);
                    res.send({ ok : true });
                    return null;
                default: break;
            }

            if ( query.length ){
                query.forEach(async item => {
                    await db.query( item, (err:MysqlError, response:any) => { if (err) error.push(error); result.push(response) } )
                })
                if ( !error.length ) res.send({ ok: true, ...result })
                else res.send({ ok: false, ...error })
            }
            else {
                res.send({ ok: false,  })
            }
        },

        update : ( {body}, res ) => {
            let { table, filename, thumbnail, title, albumId, id  } = body,
                query:string

            switch (table) {
                case 'music':
                        query = `UPDATE ${table} SET title = "${title || 'title'}", albumId = ${albumId || 'albumId'}, filename = "${filename || 'filename'}", thumbnail = "${thumbnail || 'thumbnail'}" WHERE id = ${id}`
                    break;
                default:
                    break;
            }

            res.send(query)
        }
    }

export { auth, user, data }