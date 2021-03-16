/*
* Primary file for the API
*
*/

//  Dependencies
const server = require('./lib/server')
// const workers = require('./lib/workers')
const db = require('./lib/db')

//  Declare the app
let app = {}

//  Init function
app.init = ()=>{
  //  Start the server
  server.init()

  //  Start the workers
  // workers.init()
  
  //  Start the database
  db.init()
}

//  Execute
app.init()

//  Export the app
module.exports = app
