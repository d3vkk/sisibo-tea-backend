/*
* Primary file for the API
*
*/

//  Dependencies
const server = require('./lib/server')
const db = require('./lib/db')

//  Declare the app
let app = {}

//  Init function
app.init = ()=>{
  //  Start the server
  server.init()
  
  //  Start the database
  db.init()
}

//  Execute
app.init()

//  Export the app
module.exports = app
