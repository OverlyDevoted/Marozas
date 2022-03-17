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
        let game = clients[clientID].game
        if(game)
        {
            console.log(game);
            RemoveFromGame(clientID);
        }
        RemoveClient(clientID);
    })
    connection.on("message", message=>{
        let result = {};
        try {
            result = JSON.parse(message.utf8Data)
        } catch (error) {
            console.log(error)
            return;
        }
        //receiving message from user
        console.log(result)
        switch(result.method)
        {
            case "create": {
                const gameID = createGuid();
                games[gameID] = {"clients":[]};
                SendMessage(clients[clientID].connection, "create", {"gameID":gameID});
            } break;
            case "join":
                const gameID = result.gameID;
                const game = games[gameID];
                if(!game)
                {
                    console.log("no such game");
                    SendMessage(clients[clientID].connection, "error", {"message":"Game " + gameID + " does not exist"});
                    return;
                }
                if(game.clients.length > 4)
                {
                    console.log("lobby full");
                    SendMessage(clients[clientID].connection, "error", {"message":"Game " + gameID + " is full"});
                    return;
                }
                clients[clientID].game = gameID;
                game.clients.push({
                    "clientID":clientID,
                    "prio": game.clients.length,
                    "ready": "false"
                })
                games[gameID] = game;
                game.clients.forEach(c =>{
                    if(c.clientID === clientID)
                    {
                        game.gameID = gameID;
                        SendMessage(clients[c.clientID].connection,"join", game);
                    }
                    else
                    {
                        SendMessage(clients[c.clientID].connection,"playerJoined", {"clientID":clientID});
                    }
                });

                break;
            case "disconnect":
                {
                    RemoveFromGame(clientID);
                }
                break;
            case "ready":
                {
                    const gameID = clients[clientID].game;
                    let game = games[gameID];
                    
                    game.clients.forEach(c =>{
                        if(c.clientID == clientID)
                        {
                            if(c.ready)
                                c.ready = false;
                            else
                                c.ready = true;
                        }
                        else
                        {
                            SendMessage(clients[c.clientID].connection, "ready", {"clientID":clientID});
                        }
                    });
                    games[gameID] = game;
                }
                break;
            default:
                console.log("No such function");
                break;
        }
    })
    
    const clientID = createGuid();
    clients[clientID] = {
        "connection":connection,
        "game":null
    };
    let method = {
        "method":"connect"
    };
    SendMessage(connection, "connect", {"clientID":clientID});
})
function RemoveFromGame(clientID)
{
    const gameID = clients[clientID].game;
    clients[clientID].game = null;
    let newClients = [];
    let prio;
    const game = games[gameID];
    if(game.clients.length === 1)
    {
        RemoveGame(gameID);
        return;
    }
    //find prio of the disconnected player
    game.clients.forEach(c=>{
        if(c.clientID === clientID)
        {
            prio = c.prio;
        }
    });
    
    game.clients.forEach(c=>{
        //if not the disconnected player
        if(c.clientID != clientID)
        {
            //new prio = current prio
            newPrio = c.prio;
            //if the old prio greater than 
            if(c.prio > prio)
                newPrio--;
            c.prio = newPrio;
            newClients.push(c);
        }
    });
    game.clients = newClients;
    games[gameID] = game;
    console.log(games[gameID]);
    game.clients.forEach(c =>{
        SendMessage(clients[c.clientID].connection,"playerDisconnected", {"clientID":clientID, "prio":c.prio});
    });
}
function RemoveGame(gameID)
{
    delete games[gameID];
    console.log("Game " + gameID + " has been deleted");
}
function RemoveClient(clientID)
{
    delete clients[clientID];
    console.log("Player " + clientID + " has disconnected");
}
function createGuid(){  
    function S4() {  
       return (((1+Math.random())*0x10000)|0).toString(16).substring(1);  
    }  
    return (S4() + S4() + "-" + S4() + "-4" + S4().substr(0,3) + "-" + S4() + "-" + S4() + S4() + S4()).toLowerCase();  
 }  
function SendMessage(connection, methodName, payload){
    connection.send(JSON.stringify({"name":methodName}));
    connection.send(JSON.stringify(payload));
}
