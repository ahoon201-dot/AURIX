import React,{useState} from "react";
import {createRoot} from "react-dom/client";
import "./style.css";

const screens=[
 ["welcome","Welcome"],["home","Home"],["level","Level 12"],["wallet","Wallet"],["buy","Buy PERS"],
 ["mining","Mining"],["tasks","Daily Tasks"],["friends","Invite Friends"],["leaderboard","Leaderboard"],["profile","Profile"]
];

function App(){
 const [screen,setScreen]=useState("welcome");
 const idx=screens.findIndex(x=>x[0]===screen);
 const go=(s)=>setScreen(s);
 return <div className="app">
   <div className="phone">
     <img className="ref" src={`./screens/${screen}.jpg`} />
     <div className="hotspots">
       {screen==="welcome" && <button className="hot start" onClick={()=>go("home")}/>}
       {screen==="home" && <>
         <button className="hot nav1" onClick={()=>go("home")}/>
         <button className="hot nav2" onClick={()=>go("tasks")}/>
         <button className="hot nav3" onClick={()=>go("level")}/>
         <button className="hot nav4" onClick={()=>go("friends")}/>
         <button className="hot nav5" onClick={()=>go("wallet")}/>
         <button className="hot mine" onClick={()=>go("mining")}/>
       </>}
       {screen==="level" && <button className="hot back" onClick={()=>go("home")}/>}
       {screen==="wallet" && <>
         <button className="hot back" onClick={()=>go("home")}/>
         <button className="hot buy" onClick={()=>go("buy")}/>
         <button className="hot profile" onClick={()=>go("profile")}/>
       </>}
       {screen==="buy" && <button className="hot back" onClick={()=>go("wallet")}/>}
       {screen==="mining" && <>
         <button className="hot back" onClick={()=>go("home")}/>
         <button className="hot miningBtn" onClick={()=>go("home")}/>
       </>}
       {screen==="tasks" && <>
         <button className="hot back" onClick={()=>go("home")}/>
         <button className="hot taskNav" onClick={()=>go("friends")}/>
       </>}
       {screen==="friends" && <button className="hot back" onClick={()=>go("home")}/>}
       {screen==="leaderboard" && <button className="hot back" onClick={()=>go("home")}/>}
       {screen==="profile" && <button className="hot back" onClick={()=>go("home")}/>}
     </div>
   </div>
   <div className="caption">PERSEPOLIS · EXACT DESIGN REFERENCE</div>
 </div>
}
createRoot(document.getElementById("root")).render(<App/>);
