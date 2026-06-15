/* global React */
const { useState } = React;

function SizeOption({ size, ml, active, scale, onClick }) {
  return (
    <button onClick={onClick} style={{
      background:'transparent', border:'none', cursor:'pointer', display:'flex', flexDirection:'column', alignItems:'center', gap:6, padding:'12px 8px',
    }}>
      <div style={{
        width:64, height:64, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center',
        border: active ? '2px solid #00754A' : '2px solid transparent',
        background: active ? 'rgba(255,255,255,0.06)' : 'transparent',
      }}>
        <svg viewBox="0 0 30 38" width={26 + scale} height={32 + scale}>
          <path d={`M${5-scale*0.4} 4 H${25+scale*0.4} L${23+scale*0.4} 36 H${7-scale*0.4} Z`} stroke="#fff" strokeWidth="1.5" fill="none"/>
        </svg>
      </div>
      <div style={{fontSize:15, fontWeight:700, color:'#fff', letterSpacing:'-0.16px'}}>{size}</div>
      <div style={{fontSize:12, color:'rgba(255,255,255,0.7)'}}>{ml}</div>
    </button>
  );
}

function AddInRow({ label, value, hasStepper, count, onCount }) {
  return (
    <div style={{
      position:'relative', background:'#fff', border:'1px solid #d6dbde', borderRadius:4, padding:'18px 12px 10px',
    }}>
      <div style={{position:'absolute', top:8, left:12, fontSize:13, fontWeight:700, letterSpacing:'0.325px', textTransform:'uppercase', color:'rgba(0,0,0,0.87)'}}>{label}</div>
      <div style={{display:'flex', alignItems:'center'}}>
        <span style={{fontSize:16, color:'rgba(0,0,0,0.87)', flex:1}}>{value}</span>
        {hasStepper ? (
          <div style={{display:'flex', alignItems:'center', gap:10}}>
            <button onClick={()=>onCount(Math.max(0,count-1))} style={{width:32, height:32, borderRadius:'50%', border:'1px solid #d6dbde', background:'#fff', fontSize:18, lineHeight:1, cursor:'pointer'}}>−</button>
            <span style={{fontWeight:700, minWidth:14, textAlign:'center'}}>{count}</span>
            <button onClick={()=>onCount(count+1)} style={{width:32, height:32, borderRadius:'50%', border:'1px solid #d6dbde', background:'#fff', fontSize:18, lineHeight:1, cursor:'pointer'}}>+</button>
          </div>
        ) : (
          <span style={{color:'rgba(0,0,0,0.58)', fontSize:18}}>▾</span>
        )}
      </div>
    </div>
  );
}

function ProductDetailPage() {
  const [size, setSize] = useState('Grande');
  const [scoops, setScoops] = useState(1);

  return (
    <main style={{background:'#f2f0eb'}}>
      {/* Dark-green product header */}
      <section style={{background:'#1E3932', color:'#fff', padding:'40px 32px 32px'}}>
        <div style={{fontSize:14, color:'rgba(255,255,255,0.7)', marginBottom:14}}>
          Menu / Refreshers / <span style={{color:'#fff'}}>Pink Energy Drink</span>
        </div>
        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:48, alignItems:'center'}}>
          <div>
            <h1 style={{fontSize:32, fontWeight:700, color:'#fff', textTransform:'uppercase', letterSpacing:'-0.16px', margin:'0 0 16px'}}>
              Pink Energy Drink
            </h1>
            <span style={{display:'inline-block', border:'1px solid #cba258', color:'#cba258', borderRadius:50, padding:'4px 12px', fontSize:13, fontWeight:700, letterSpacing:'0.5px', marginBottom:18}}>200★ item</span>
            <p style={{color:'#fff', fontSize:16, lineHeight:1.6, marginBottom:16, maxWidth:480}}>
              A vibrant, fruit-forward energy drink with strawberry açaí, coconut milk, and a kick of caffeine — sunrise in a cup.
            </p>
            <div style={{fontSize:14, fontWeight:700, color:'#fff', marginBottom:24}}>140 calories · 25g sugar · 2.5g fat</div>
            <button className="sb-btn sb-btn-out-dark">Full nutrition &amp; ingredients list</button>
          </div>
          <div style={{aspectRatio:'1', borderRadius:24, background:'radial-gradient(circle at 60% 40%, #fde2e7 0%, #f59cb5 45%, #c5527a 100%)', position:'relative', overflow:'hidden'}}>
            <div style={{position:'absolute', left:'50%', top:'12%', transform:'translateX(-50%)', width:'42%', height:'76%', background:'linear-gradient(180deg, rgba(255,255,255,0.5) 0%, #f8a4c2 30%, #c5527a 100%)', borderRadius:'8px 8px 18px 18px'}}/>
          </div>
        </div>
      </section>

      {/* Size selector — dark-green band */}
      <section style={{background:'#1E3932', padding:'8px 16px 40px'}}>
        <div style={{maxWidth:780, margin:'0 auto', background:'rgba(255,255,255,0.04)', borderRadius:12, padding:'8px 12px', display:'flex', justifyContent:'space-around'}}>
          <SizeOption size="Tall"   ml="12 fl oz" active={size==='Tall'}    scale={0}  onClick={()=>setSize('Tall')}/>
          <SizeOption size="Grande" ml="16 fl oz" active={size==='Grande'}  scale={3}  onClick={()=>setSize('Grande')}/>
          <SizeOption size="Venti"  ml="24 fl oz" active={size==='Venti'}   scale={6}  onClick={()=>setSize('Venti')}/>
          <SizeOption size="Trenta" ml="30 fl oz" active={size==='Trenta'}  scale={9}  onClick={()=>setSize('Trenta')}/>
        </div>
      </section>

      {/* Customize flow */}
      <section style={{background:'#fff', padding:'40px 32px', borderRadius:'16px 16px 0 0', marginTop:-24}}>
        <div style={{maxWidth:780, margin:'0 auto'}}>
          <h2 style={{fontSize:24, fontWeight:400, color:'rgba(0,0,0,0.87)', letterSpacing:'-0.16px', margin:'0 0 24px'}}>Customize</h2>
          <div style={{display:'grid', gap:14}}>
            <AddInRow label="Add-ins" value="Ice"/>
            <AddInRow label="Milk" value="Coconut"/>
            <AddInRow label="Strawberry Fruit Inclusions scoop" value="" hasStepper count={scoops} onCount={setScoops}/>
          </div>
          <div style={{display:'flex', gap:12, marginTop:32}}>
            <button className="sb-btn sb-btn-customize">
              <span style={{color:'#cba258', marginRight:8}}>✦</span>Customize
            </button>
            <button className="sb-btn sb-btn-filled" style={{padding:'14px 32px'}}>Add to order</button>
          </div>
        </div>
      </section>
    </main>
  );
}

window.ProductDetailPage = ProductDetailPage;
