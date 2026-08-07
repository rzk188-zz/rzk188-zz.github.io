const server = "haowan.pro";


fetch(
`https://api.mcstatus.io/v2/status/java/${server}`
)


.then(response=>response.json())


.then(data=>{


if(data.online){


document.getElementById("status")
.innerHTML =
"🟢 SERVER ONLINE";


document.getElementById("serverText")
.innerHTML =
"伺服器正常運行";


document.getElementById("online")
.innerHTML =
data.players.online;


document.getElementById("max")
.innerHTML =
data.players.max;


}else{


document.getElementById("status")
.innerHTML =
"🔴 SERVER OFFLINE";


}



})


.catch(()=>{


document.getElementById("status")
.innerHTML =
"🔴 無法取得狀態";


});
