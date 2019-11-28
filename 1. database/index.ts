import mysql from 'mysql'

export default mysql.createConnection({
    user : 'root',
    password : 'password',
    database : 'final_project',
    host : 'localhost',
})