//we create a http to establish a tcp connection in order to pass 
//that into the websocket logic
const { response } = require("express");
const { json } = require("express/lib/response");
const http = require("http");
const { client } = require("websocket");

const websocketServer = require("websocket").server
const httpServer = http.createServer();
httpServer.listen(9090, ()=>{console.log("Listening to port 9090")})

const clients = {};
const games = {};
//under the wsServer start owning the httpServer, so maybe
//that's how it gets the tcp?
const wsServer = new websocketServer({
    "httpServer": httpServer
})

//this captures the tcp 
wsServer.on("request", request =>{
    const connection = request.accept(null, request.origin)
    connection.on("open", () => console.log("opened"))
    connection.on("close", (sender, e) => {

    })
    connection.on("message", message=>{
        
        const result = JSON.parse(message.utf8Data)
        //receiving message from user
        console.log(result)

    })
    
    const clientId = createGuid();
    clients[clientId] = {
        "connection":connection,
        "game":null
    };
})

function createGuid(){  
    function S4() {  
       return (((1+Math.random())*0x10000)|0).toString(16).substring(1);  
    }  
    return (S4() + S4() + "-" + S4() + "-4" + S4().substr(0,3) + "-" + S4() + "-" + S4() + S4() + S4()).toLowerCase();  
 }  

