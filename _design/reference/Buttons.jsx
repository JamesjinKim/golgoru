/* global React */

function Frap({ onClick }) {
  return (
    <button
      onClick={onClick}
      aria-label="Order"
      className="sb-frap"
      style={{
        position:'fixed', bottom:20, right:20, width:56, height:56, borderRadius:'50%',
        background:'#00754A', border:'none', cursor:'pointer', zIndex:40,
        boxShadow:'0 0 6px rgba(0,0,0,0.24), 0 8px 12px rgba(0,0,0,0.14)',
        display:'flex', alignItems:'center', justifyContent:'center',
        transition:'all .2s ease',
      }}
    >
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/>
      </svg>
    </button>
  );
}

window.Frap = Frap;
