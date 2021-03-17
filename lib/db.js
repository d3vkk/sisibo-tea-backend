/*
*   writing to, update and retrieval of data
*/
const { createConnection } = require('mysql')
const { database } = require('./config')

//  Container for all db operations
const db = {}

//  connection object
db.con = createConnection({
    host: database.host,
    user: database.user,
    password: database.password,
    database: database.name
  })

//  start the db
db.init = ()=>{
    db.con.connect((err) => {
            if (!err) {
                console.log('\x1b[34m%s\x1b[0m', `DB connected`)
            } else {
                console.log('\x1b[31m%s\x1b[0m', 'Error connecting to the database')
            }
        })
}

//  run queries
db.run = (sql, callback)=>{    
    db.con.query(sql, (err, result)=>{
        if (!err) {
            callback(false, {result})
        } else {
            callback(err)
        }
    })
}

module.exports = db