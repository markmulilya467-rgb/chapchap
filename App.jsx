import { useState, useEffect, useRef } from "react";
import {
  MapPin, User, Bell, DollarSign, Navigation, CheckCircle,
  Phone, MessageSquare, BarChart2, AlertCircle, ChevronRight,
  Home, Send, List, Package, Zap, Clock, Star, TrendingUp,
  Shield, Truck, Activity
} from "lucide-react";

// ─── Design Tokens ───────────────────────────────────────────────────────────
const C = {
  bg:       "#06060E",
  surface:  "#0D0D1C",
  card:     "#13131F",
  border:   "#1E1E32",
  accent:   "#FF5C00",
  accentHi: "#FF7A2B",
  green:    "#00C896",
  yellow:   "#FFB800",
  red:      "#FF3D57",
  purple:   "#9B6DFF",
  text:     "#F0F0FA",
  muted:    "#5A5A7A",
  faint:    "#1A1A2E",
};

// ─── Data ────────────────────────────────────────────────────────────────────
const ZONES = ["CBD", "Westlands", "Karen", "Kilimani", "Eastleigh",
               "Kasarani", "Langata", "Lavington", "Parklands", "Ruaka", "Upperhill"];

const VEHICLES = [
  { type: "Motorcycle", emoji: "🏍️", base: 150, eta: "15–25 min", tag: "Fastest" },
  { type: "Bicycle",   emoji: "🚲",  base: 80,  eta: "20–35 min", tag: "Eco" },
  { type: "Car",       emoji: "🚗",  base: 350, eta: "20–40 min", tag: "Large" },
  { type: "Van",       emoji: "🚐",  base: 800, eta: "30–60 min", tag: "Bulk" },
];

const RIDERS = [
  { id:1, name:"James Kamau",   rating:4.9, trips:234, status:"available",    vehicle:"Motorcycle", zone:"Westlands", today:1240 },
  { id:2, name:"Faith Wanjiru", rating:4.8, trips:189, status:"on_delivery",  vehicle:"Motorcycle", zone:"CBD",       today:980  },
  { id:3, name:"Brian Odhiambo",rating:4.7, trips:312, status:"available",    vehicle:"Bicycle",   zone:"Kilimani",  today:760  },
  { id:4, name:"Grace Akinyi",  rating:4.9, trips:156, status:"available",    vehicle:"Motorcycle", zone:"Karen",     today:640  },
  { id:5, name:"Mike Njoroge",  rating:4.6, trips:278, status:"offline",      vehicle:"Van",        zone:"Kasarani",  today:0    },
];

const SEED_ORDERS = [
  { id:"CC001", customer:"Alice Mwangi",  pickup:"Westlands", dropoff:"Karen",     status:"in_transit", rider:"James Kamau",   amount:350, type:"parcel", ago:"12 min" },
  { id:"CC002", customer:"Peter Otieno",  pickup:"CBD",       dropoff:"Kilimani",  status:"pending",    rider:null,            amount:180, type:"food",   ago:"2 min"  },
  { id:"CC003", customer:"Sarah Ndege",   pickup:"Kasarani",  dropoff:"Parklands", status:"delivered",  rider:"Faith Wanjiru", amount:520, type:"parcel", ago:"1 hr"   },
  { id:"CC004", customer:"David Kamau",   pickup:"Lavington", dropoff:"CBD",       status:"assigned",   rider:"Brian Odhiambo",amount:290, type:"food",   ago:"8 min"  },
  { id:"CC005", customer:"Lucy Wambui",   pickup:"Karen",     dropoff:"Westlands", status:"pending",    rider:null,            amount:410, type:"parcel", ago:"5 min"  },
];

// ─── Micro-components ────────────────────────────────────────────────────────
const STATUS_CFG = {
  pending:     { color: C.yellow, label: "Pending"     },
  assigned:    { color: "#4A90FF", label: "Assigned"   },
  in_transit:  { color: C.accent, label: "In Transit"  },
  delivered:   { color: C.green,  label: "Delivered"   },
  available:   { color: C.green,  label: "Available"   },
  on_delivery: { color: C.accent, label: "On Delivery" },
  offline:     { color: C.muted,  label: "Offline"     },
};

function Pill({ status }) {
  const s = STATUS_CFG[status] || STATUS_CFG.pending;
  return (
    <span style={{ background: s.color + "22", color: s.color, padding: "3px 10px",
      borderRadius: 20, fontSize: 11, fontWeight: 700, letterSpacing: 0.3 }}>
      {s.label}
    </span>
  );
}

function Toast({ msg }) {
  return (
    <div style={{ position:"fixed", top:20, left:20, right:20, background: C.green,
      borderRadius:14, padding:"14px 18px", zIndex:500, color:"white",
      fontWeight:700, fontSize:14, display:"flex", alignItems:"center", gap:10,
      boxShadow:"0 8px 32px #00C89644" }}>
      <CheckCircle size={16}/> {msg}
    </div>
  );
}

function BottomNav({ tabs, active, onSelect }) {
  return (
    <div style={{ position:"fixed", bottom:0, left:0, right:0, background: C.surface,
      borderTop:`1px solid ${C.border}`, display:"flex", padding:"10px 0 20px" }}>
      {tabs.map(({ key, Icon, label }) => (
        <button key={key} onClick={() => onSelect(key)}
          style={{ flex:1, background:"none", border:"none", cursor:"pointer",
            display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
          <Icon size={20} color={active===key ? C.accent : C.muted}/>
          <span style={{ fontSize:10, color: active===key ? C.accent : C.muted,
            fontWeight: active===key ? 700 : 400 }}>{label}</span>
        </button>
      ))}
    </div>
  );
}

// ─── Main App ────────────────────────────────────────────────────────────────
export default function ChapChap() {
  const [role,     setRole]     = useState(null);
  const [tab,      setTab]      = useState("home");
  const [orders,   setOrders]   = useState(SEED_ORDERS);
  const [toast,    setToast]    = useState(null);
  const [step,     setStep]     = useState(0);   // booking step
  const [pickup,   setPickup]   = useState("");
  const [dropoff,  setDropoff]  = useState("");
  const [vehicle,  setVehicle]  = useState(null);
  const [progress, setProgress] = useState(0);
  const [activeOrder, setActiveOrder] = useState(null);
  // Rider state
  const [rStatus,  setRStatus]  = useState("available");
  const [incoming, setIncoming] = useState(null);
  const [todayEarned, setTodayEarned] = useState(1240);
  // AI Chat
  const [msgs, setMsgs]         = useState([{ role:"assistant",
    content:"Hey! I'm ChapChap AI 👋 I can book deliveries, track orders, or give you a price quote. What do you need?" }]);
  const [input, setInput]       = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const chatEnd = useRef(null);

  const notify = (msg) => { setToast(msg); setTimeout(()=>setToast(null), 3000); };

  // Tracking animation
  useEffect(()=>{
    if(step===4 && progress<100){
      const t = setInterval(()=> setProgress(p=> p>=100?(clearInterval(t),100):p+1.5), 300);
      return ()=>clearInterval(t);
    }
  },[step, progress]);

  // Rider: simulate incoming order
  useEffect(()=>{
    if(role==="rider" && rStatus==="available" && !incoming){
      const t = setTimeout(()=>setIncoming({
        id:"CC006", pickup:"Westlands Mall", dropoff:"Lavington Green",
        dist:"4.2 km", amount:320, type:"parcel", customer:"Emma Njeri"
      }), 4000);
      return ()=>clearTimeout(t);
    }
  },[role, rStatus, incoming]);

  useEffect(()=>{ chatEnd.current?.scrollIntoView({behavior:"smooth"}); },[msgs]);

  const placeOrder = () => {
    const o = { id:`CC00${orders.length+1}`, customer:"You", pickup, dropoff,
      status:"assigned", rider:"James Kamau",
      amount: vehicle.base + Math.round(Math.random()*80+40),
      type:"parcel", ago:"Just now" };
    setOrders(p=>[o,...p]);
    setActiveOrder(o);
    setProgress(0);
    setStep(4);
    notify("Order placed — James is on his way 🏍️");
  };

  const sendAI = async () => {
    if(!input.trim()||aiLoading) return;
    const txt = input; setInput(""); setAiLoading(true);
    setMsgs(p=>[...p,{role:"user",content:txt}]);
    try {
      const r = await fetch("https://api.anthropic.com/v1/messages",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({
          model:"claude-sonnet-4-6", max_tokens:1000,
          system:`You are ChapChap AI — the smart assistant for ChapChap, Africa's fastest delivery platform in Nairobi, Kenya.
You help customers book deliveries, track orders, quote prices, and resolve issues.
Prices: Motorcycle KES 150–300 · Bicycle KES 80–200 · Car KES 350–600 · Van KES 800–1500.
Areas served: CBD, Westlands, Karen, Kilimani, Eastleigh, Kasarani, Langata, Lavington, Parklands, Ruaka, Upperhill.
Average delivery time: 20–35 minutes. Be concise, warm, and efficient. Never say you're Claude or Anthropic.`,
          messages:[...msgs.map(m=>({role:m.role,content:m.content})),{role:"user",content:txt}]
        })
      });
      const d = await r.json();
      setMsgs(p=>[...p,{role:"assistant",content:d.content?.[0]?.text||"Let me look into that for you!"}]);
    } catch {
      setMsgs(p=>[...p,{role:"assistant",content:"Connection issue — please try again in a moment."}]);
    } finally { setAiLoading(false); }
  };

  // ── Auth ───────────────────────────────────────────────────────────────────
  if(!role) return (
    <div style={{ minHeight:"100vh", background: C.bg, display:"flex", flexDirection:"column",
      alignItems:"center", justifyContent:"center", padding:24,
      fontFamily:"'Inter',system-ui,sans-serif" }}>
      {/* Brand */}
      <div style={{ textAlign:"center", marginBottom:52 }}>
        <div style={{ width:72, height:72, background:`linear-gradient(135deg,${C.accent},#FF2D55)`,
          borderRadius:22, display:"flex", alignItems:"center", justifyContent:"center",
          margin:"0 auto 18px", fontSize:32, boxShadow:`0 12px 40px ${C.accent}44` }}>
          ⚡
        </div>
        <h1 style={{ color:C.text, fontSize:36, fontWeight:900, margin:0, letterSpacing:-1.5 }}>ChapChap</h1>
        <p style={{ color:C.muted, fontSize:14, marginTop:6 }}>African Logistics · Powered by AI</p>
      </div>

      <div style={{ width:"100%", maxWidth:360 }}>
        <p style={{ color:C.muted, fontSize:11, fontWeight:700, letterSpacing:2,
          marginBottom:16, textAlign:"center" }}>SELECT YOUR ROLE</p>
        {[
          { key:"customer", emoji:"📦", label:"Customer",   sub:"Book & track deliveries" },
          { key:"rider",    emoji:"🏍️", label:"Rider",      sub:"Accept & complete orders" },
          { key:"ops",      emoji:"🎛️", label:"Operations", sub:"Monitor & dispatch fleet"  },
        ].map(r=>(
          <button key={r.key}
            onClick={()=>{ setRole(r.key); setTab("home"); }}
            onMouseEnter={e=>e.currentTarget.style.borderColor=C.accent}
            onMouseLeave={e=>e.currentTarget.style.borderColor=C.border}
            style={{ width:"100%", background: C.card, border:`1px solid ${C.border}`,
              borderRadius:18, padding:"18px 20px", marginBottom:12, cursor:"pointer",
              display:"flex", alignItems:"center", gap:16, transition:"border-color 0.2s" }}>
            <span style={{ fontSize:28 }}>{r.emoji}</span>
            <div style={{ textAlign:"left" }}>
              <div style={{ color:C.text, fontWeight:700, fontSize:16 }}>{r.label}</div>
              <div style={{ color:C.muted, fontSize:13 }}>{r.sub}</div>
            </div>
            <ChevronRight size={18} color={C.muted} style={{ marginLeft:"auto" }}/>
          </button>
        ))}
      </div>
      <p style={{ color:C.muted, fontSize:12, marginTop:36 }}>🇰🇪 Kenya · 🇪🇹 Ethiopia · 🇪🇬 Egypt · 🇿🇦 South Africa · 🇬🇭 Ghana</p>
    </div>
  );

  // ── Customer ───────────────────────────────────────────────────────────────
  if(role==="customer") {
    const eta = Math.max(1, Math.round((100-progress)/4));
    const stageIdx = progress<15?0:progress<35?1:progress<65?2:progress<90?3:4;
    const stages = ["Placed","Assigned","Picked Up","In Transit","Delivered"];

    const BookingOverlay = ()=>{
      if(step===0) return null;

      if(step===4) return (
        <div style={{ position:"fixed",inset:0,background:C.bg,zIndex:100,overflow:"auto",
          fontFamily:"inherit" }}>
          <div style={{ padding:"20px 20px 0" }}>
            <button onClick={()=>{setStep(0);setProgress(0);}}
              style={{ background:"none",border:"none",color:C.muted,cursor:"pointer",fontSize:14 }}>
              ← Back
            </button>
          </div>

          {/* Map */}
          <div style={{ margin:"16px 20px", height:220, borderRadius:20, overflow:"hidden",
            position:"relative", background:"linear-gradient(135deg,#0A1628,#112040)" }}>
            {[...Array(20)].map((_,i)=>(
              <div key={i} style={{ position:"absolute", width:3, height:3, background:"#FFFFFF08",
                borderRadius:"50%", left:`${5+i*5}%`, top:`${15+(i%5)*15}%` }}/>
            ))}
            <div style={{ position:"absolute", left:"12%", right:"12%", top:"50%",
              height:3, background: C.border, borderRadius:4 }}/>
            <div style={{ position:"absolute", left:"12%", top:"50%", height:3,
              width:`${progress*0.76}%`, background:C.accent,
              borderRadius:4, transition:"width 0.4s" }}/>
            <div style={{ position:"absolute", left:"9%", top:"44%", fontSize:18 }}>📍</div>
            <div style={{ position:"absolute", right:"9%", top:"44%", fontSize:18 }}>🎯</div>
            <div style={{ position:"absolute", top:"36%", fontSize:24,
              left:`${8+progress*0.74}%`, transition:"left 0.4s" }}>🏍️</div>
            <div style={{ position:"absolute", top:16, left:16,
              background:"#00000070", borderRadius:12, padding:"8px 14px",
              backdropFilter:"blur(8px)" }}>
              <div style={{ color:C.text, fontWeight:800, fontSize:24 }}>
                {progress<100?`${eta} min`:"Arrived!"}
              </div>
              <div style={{ color:C.muted, fontSize:11 }}>Estimated arrival</div>
            </div>
          </div>

          {/* Rider card */}
          <div style={{ margin:"0 20px 14px", background: C.card,
            border:`1px solid ${C.border}`, borderRadius:18, padding:18 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
              marginBottom:16 }}>
              <div>
                <div style={{ color:C.text, fontWeight:700, fontSize:16 }}>James Kamau</div>
                <div style={{ color:C.muted, fontSize:13 }}>⭐ 4.9 · Motorcycle · KES {activeOrder?.amount}</div>
              </div>
              <div style={{ display:"flex", gap:10 }}>
                {[Phone,MessageSquare].map((Icon,i)=>(
                  <button key={i} style={{ width:42,height:42,background:C.faint,
                    border:`1px solid ${C.border}`,borderRadius:12,
                    display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer" }}>
                    <Icon size={16} color={C.accent}/>
                  </button>
                ))}
              </div>
            </div>
            {/* Progress bar */}
            <div style={{ display:"flex", justifyContent:"space-between", position:"relative" }}>
              <div style={{ position:"absolute",top:8,left:"10%",right:"10%",height:2,background:C.border }}/>
              <div style={{ position:"absolute",top:8,left:"10%",height:2,background:C.accent,
                width:`${(stageIdx/4)*80}%`, transition:"width 0.5s" }}/>
              {stages.map((s,i)=>(
                <div key={s} style={{ textAlign:"center",zIndex:1 }}>
                  <div style={{ width:18,height:18,borderRadius:"50%",margin:"0 auto 6px",
                    background:i<=stageIdx?C.accent:C.border,
                    display:"flex",alignItems:"center",justifyContent:"center" }}>
                    {i<stageIdx&&<CheckCircle size={10} color="white"/>}
                  </div>
                  <div style={{ color:i<=stageIdx?C.text:C.muted,fontSize:9,maxWidth:48 }}>{s}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Route */}
          <div style={{ margin:"0 20px",background:C.card,border:`1px solid ${C.border}`,
            borderRadius:18,padding:18 }}>
            {[[C.green,activeOrder?.pickup],[C.accent,activeOrder?.dropoff]].map(([col,loc],i)=>(
              <div key={i} style={{ display:"flex",alignItems:"center",gap:12,
                padding:"8px 0",borderBottom:i===0?`1px solid ${C.border}`:"none" }}>
                <div style={{ width:10,height:10,borderRadius:"50%",background:col,flexShrink:0 }}/>
                <span style={{ color:C.text,fontSize:14 }}>{loc}</span>
              </div>
            ))}
          </div>
        </div>
      );

      return (
        <div style={{ position:"fixed",inset:0,background:C.bg,zIndex:100,overflow:"auto",
          fontFamily:"inherit",padding:24 }}>
          <button onClick={()=>setStep(s=>Math.max(0,s-1))}
            style={{ background:"none",border:"none",color:C.muted,cursor:"pointer",
              marginBottom:28,fontSize:14 }}>
            ← {step===1?"Cancel":"Back"}
          </button>

          {step===1&&<>
            <h2 style={{ color:C.text,fontSize:26,fontWeight:900,marginBottom:6 }}>Where to?</h2>
            <p style={{ color:C.muted,fontSize:14,marginBottom:28 }}>Pick up and drop-off in Nairobi</p>
            {[["Pickup","from",C.green,pickup,setPickup],
              ["Drop-off","to",C.accent,dropoff,setDropoff]].map(([label,ph,col,val,set])=>(
              <div key={label} style={{ marginBottom:14 }}>
                <label style={{ color:C.muted,fontSize:11,fontWeight:700,
                  display:"block",marginBottom:8,letterSpacing:1 }}>{label.toUpperCase()}</label>
                <div style={{ position:"relative" }}>
                  <MapPin size={16} color={col} style={{ position:"absolute",left:14,top:"50%",
                    transform:"translateY(-50%)" }}/>
                  <select value={val} onChange={e=>set(e.target.value)}
                    style={{ width:"100%",padding:"14px 14px 14px 42px",background:C.card,
                      border:`1px solid ${C.border}`,borderRadius:14,color:val?C.text:C.muted,
                      fontSize:15,appearance:"none",cursor:"pointer" }}>
                    <option value="">Select {ph} area...</option>
                    {ZONES.map(z=><option key={z} value={z}>{z}</option>)}
                  </select>
                </div>
              </div>
            ))}
            <button disabled={!pickup||!dropoff} onClick={()=>setStep(2)}
              style={{ width:"100%",padding:16,marginTop:8,
                background:pickup&&dropoff?C.accent:C.border,
                border:"none",borderRadius:14,color:"white",
                fontWeight:700,fontSize:16,cursor:pickup&&dropoff?"pointer":"not-allowed" }}>
              Continue →
            </button>
          </>}

          {step===2&&<>
            <h2 style={{ color:C.text,fontSize:26,fontWeight:900,marginBottom:6 }}>Pick a vehicle</h2>
            <p style={{ color:C.muted,fontSize:14,marginBottom:28 }}>{pickup} → {dropoff}</p>
            {VEHICLES.map(v=>(
              <button key={v.type} onClick={()=>setVehicle(v)}
                style={{ width:"100%",background:vehicle?.type===v.type?C.accent+"22":C.card,
                  border:`1px solid ${vehicle?.type===v.type?C.accent:C.border}`,
                  borderRadius:16,padding:"16px 18px",marginBottom:12,cursor:"pointer",
                  display:"flex",alignItems:"center",gap:16,textAlign:"left" }}>
                <span style={{ fontSize:30 }}>{v.emoji}</span>
                <div style={{ flex:1 }}>
                  <div style={{ color:C.text,fontWeight:700,fontSize:15 }}>{v.type}
                    <span style={{ background:C.accent+"22",color:C.accent,fontSize:10,
                      fontWeight:700,padding:"2px 8px",borderRadius:8,marginLeft:8 }}>{v.tag}</span>
                  </div>
                  <div style={{ color:C.muted,fontSize:13,marginTop:2 }}>{v.eta}</div>
                </div>
                <div style={{ color:C.text,fontWeight:800 }}>KES {v.base}+</div>
              </button>
            ))}
            <button disabled={!vehicle} onClick={()=>setStep(3)}
              style={{ width:"100%",padding:16,marginTop:4,
                background:vehicle?C.accent:C.border,
                border:"none",borderRadius:14,color:"white",
                fontWeight:700,fontSize:16,cursor:vehicle?"pointer":"not-allowed" }}>
              Continue →
      
