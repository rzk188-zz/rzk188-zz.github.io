/*
=================================
 HAOWAN SERVER STATUS API
 Minecraft Server Checker
=================================
*/


const serverIP = "haowan.pro";



function updateServerStatus(){



fetch(
`https://api.mcstatus.io/v2/status/java/${serverIP}`
)



.then(response => response.json())



.then(data => {



const status =
document.getElementById(
"online-status"
);



const serverOnline =
document.getElementById(
"server-online"
);



const players =
document.getElementById(
"players"
);



const max =
document.getElementById(
"max"
);



const statusPlayer =
document.getElementById(
"status-player"
);






if(data.online){



// Hero 狀態


status.innerHTML =
"🟢 SERVER ONLINE";



serverOnline.innerHTML =
"🟢 ONLINE";




// 玩家數


players.innerHTML =
data.players.online;



max.innerHTML =
data.players.max;



statusPlayer.innerHTML =

`${data.players.online} / ${data.players.max}`;



}



else{



status.innerHTML =
"🔴 SERVER OFFLINE";



serverOnline.innerHTML =
"🔴 OFFLINE";



}





})



.catch(error=>{



console.log(
"Server API Error:",
error
);



document.getElementById(
"online-status"
).innerHTML =

"⚠️ 無法取得伺服器狀態";



});



}



// 初次載入

updateServerStatus();



// 每 30 秒更新一次

setInterval(

updateServerStatus,

30000

);
