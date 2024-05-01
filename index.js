const http = require("http");
const app = require("express")();
const httpServer = http.createServer();
const webSocketServer = require("websocket").server;
httpServer.listen(8080,(req,res)=>{
    console.log("Listening on port 8080");
})
//hashmap
const clients={};
const games ={};
app.get("/",(req,res)=>{
    res.sendFile(__dirname +  "/index.html")
})
app.listen(8081,()=>console.log("Listening on http port 8081"))

const wsServer = new webSocketServer({
    "httpServer":httpServer
})

wsServer.on("request",request=>{
    //connection
    const connection = request.accept(null,request.origin);
    connection.on("open",()=>console.log("OPen"));
    connection.on("close",()=> console.log("CLOSE"))
    connection.on("message",message=>{
        //I have recieved a message
        const result = JSON.parse(message.utf8Data);
        if(result.method =="create"){
            //create a new room
            const clientId = result.clientId;
            const gameId = guid();
            games[gameId]={
                "id":gameId,
                "balls": 20,
                "clients": [],
            }
            const payload = {
                "method":"create",
                "game":games[gameId]
            }

            const con = clients[clientId].connection;
            con.send(JSON.stringify(payload));
        }

        if(result.method =="join"){
            //JOIN the game
            const clientId = result.clientId;
            const gameId = result.gameId;
            const game = games[gameId];
            if(game.clients.length >= 3){
                //sorry max players reached
                return;
            }
            const color ={"0":"Red","1":"Green","2":"Blue"} [game.clients.length]; 
            game.clients.push({
                "clientId":clientId,
                "color":color,
            }
        )

            if(game.clients.length == 3){
                updateGameState();
            }

            const payload = {
                "method": "join",
                "game":game
            }
            //send the game state to all the clients
            game.clients.forEach(client => {
                clients[client.clientId].connection.send(JSON.stringify(payload));
            });
        }

        if(result.method =="play"){
            //play the game
            const clientId = result.clientId;
            const gameId = result.gameId;
            const ballId = result.ballId;
            let state =games[gameId].state;
            if(!state)
                state ={};
            state[ballId]=result.color;

            games[gameId].state =state;
            
        }

    })
    //generate a new client id
    const clientId = guid();
    clients[clientId] = {
        "connection":connection
    }

    const payload = {
        "method":"connect",
        "clientId":clientId,
    }
    //send back the client ID
    connection.send(JSON.stringify(payload))
})

function updateGameState(){
    
    for(const g of Object.keys(games)){
        const game = games[g];
        if(game.clients.length < 3)
            continue;
        const payload ={
            "method":"update",
            "game":game,
        }
        game.clients.forEach(c=>{
            clients[c.clientId].connection.send(JSON.stringify(payload))
        })
    }
    setTimeout(updateGameState,500);
}
const guid=()=> {
    const s4=()=> Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);     
    return `${s4() + s4()}-${s4()}-${s4()}-${s4()}-${s4() + s4() + s4()}`;
  }