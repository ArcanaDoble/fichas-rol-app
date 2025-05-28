// src/App.js
import React, { useState, useEffect, useCallback } from 'react';
import { doc, getDoc, setDoc, deleteDoc, collection, getDocs } from 'firebase/firestore';
import { db } from './firebase';
import { BsDice6 } from 'react-icons/bs';
import { GiFist } from 'react-icons/gi';
import { FaFire, FaBolt, FaSnowflake, FaRadiationAlt } from 'react-icons/fa';

const MASTER_PASSWORD = '0904';

// Atributos
const atributos = ['destreza','vigor','intelecto','voluntad'];
const atributoColor = {
  destreza: '#86efac',
  vigor:    '#f87171',
  intelecto:'#60a5fa',
  voluntad: '#c084fc'
};

// Recursos / estadísticas
const recursos = ['postura','vida','ingenio','cordura','armadura'];
const recursoColor = {
  postura: '#86efac',
  vida:    '#f87171',
  ingenio: '#60a5fa',
  cordura: '#c084fc',
  armadura:'#999999'
};

// Dados
const DADOS = ['D4','D6','D8','D10','D12'];
const dadoImgUrl = dado => `/dados/${dado}.png`;

function App() {
  // ─────────────────────────────────────────────────────────────
  // STATES
  const [userType, setUserType]           = useState(null);
  const [modoOscuro]                      = useState(true); // siempre oscuro
  const [showLogin, setShowLogin]         = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [authenticated, setAuthenticated] = useState(false);
  const [authError, setAuthError]         = useState('');
  const [armas, setArmas]                 = useState([]);
  const [loading, setLoading]             = useState(true);
  const [playerName, setPlayerName]       = useState('');
  const [nameEntered, setNameEntered]     = useState(false);
  const [existingPlayers, setExistingPlayers] = useState([]);
  const [playerData, setPlayerData]       = useState({ weapons:[], atributos:{}, stats:{} });
  const [playerError, setPlayerError]     = useState('');
  const [playerInputArma, setPlayerInputArma] = useState('');

  // ─────────────────────────────────────────────────────────────
  // STYLES (si quieres seguir con inline)
  const theme = { bg:'#1f2937', text:'#f3f4f6', inputBg:'#374151' };
  const containerStyle = {
    background:theme.bg,
    color:theme.text,
    minHeight:'100vh',
    padding:'1rem'
  };
  const inputStyle = {
    background:theme.inputBg,
    color:theme.text,
    border:'1px solid #ccc',
    padding:'0.5rem',
    borderRadius:'0.25rem',
    width:'100%',
    maxWidth:'20rem'
  };
  const buttonStyle = {
    padding:'0.5rem 1rem',
    margin:'0.5rem',
    borderRadius:'0.25rem',
    border:'none',
    cursor:'pointer'
  };
  const cardStyle = {
    background:theme.inputBg,
    padding:'0.75rem',
    borderRadius:'0.25rem',
    marginBottom:'0.75rem'
  };

  // ─────────────────────────────────────────────────────────────
  // NAVEGACIÓN (volver, eliminar)
  const volverAlMenu = () => {
    setUserType(null);
    setAuthenticated(false);
    setShowLogin(false);
    setNameEntered(false);
    setPlayerName('');
    setPasswordInput('');
    setPlayerData({ weapons:[], atributos:{}, stats:{} });
    setPlayerError('');
    setPlayerInputArma('');
  };
  const eliminarFichaJugador = async () => {
    if (!window.confirm(`¿Eliminar ficha de ${playerName}?`)) return;
    await deleteDoc(doc(db,'players',playerName));
    volverAlMenu();
  };

  // ─────────────────────────────────────────────────────────────
  // FETCH EXISTING PLAYERS
  useEffect(()=>{
    if(userType==='player'){
      getDocs(collection(db,'players'))
        .then(snap => setExistingPlayers(snap.docs.map(d=>d.id)));
    }
  },[userType]);

  // ─────────────────────────────────────────────────────────────
  // FETCH ARMAS
  const fetchArmas = useCallback(async ()=>{
    setLoading(true);
    try {
      const res = await fetch(
        'https://docs.google.com/spreadsheets/d/1Fc46hHjCWRXCEnHl3ZehzMEcxewTYaZEhd-v-dnFUjs/gviz/tq?sheet=Lista_Armas&tqx=out:json'
      );
      const text = await res.text();
      const json = JSON.parse(text.slice(text.indexOf('(')+1,text.lastIndexOf(')')));
      const cols = json.table.cols.map(c=>c.label||c.id);
      const datos = (json.table.rows||[]).map(r=>{
        const obj={};
        cols.forEach((l,i)=>obj[l]=r.c[i]?.v||'');
        const rasgos = obj.RASGOS
          ? (obj.RASGOS.match(/\[([^\]]+)\]/g)||[]).map(s=>s.replace(/[\[\]]/g,'').trim())
          : [];
        return {
          nombre: obj.NOMBRE,
          dano:    obj.DAÑO,
          alcance: obj.ALCANCE,
          consumo: obj.CONSUMO,
          carga:   obj.CARGA,
          rasgos,
          descripcion: obj.DESCRIPCIÓN||'',
          tipoDano:    obj.TIPO_DAÑO||obj['TIPO DAÑO']||'físico'
        };
      });
      setArmas(datos);
    } catch(e){
      console.error(e);
    } finally{
      setLoading(false);
    }
  },[]);
  useEffect(()=>{ fetchArmas() },[fetchArmas]);

  // ─────────────────────────────────────────────────────────────
  // LOAD PLAYER DATA
  const loadPlayer = useCallback(async ()=>{
    if(!nameEntered) return;
    const ref = doc(db,'players',playerName);
    const snap = await getDoc(ref);
    // valores por defecto
    const baseA = {};
    atributos.forEach(k=> baseA[k]='D4');
    const baseS = {};
    recursos.forEach(r=>{
      baseS[r]={ base:0, total:0, actual:0, buff:0 };
    });
    if(snap.exists()){
      const d = snap.data();
      setPlayerData({
        weapons:  d.weapons||[],
        atributos:{ ...baseA, ...(d.atributos||{}) },
        stats:    { ...baseS,   ...(d.stats||{}) }
      });
    } else {
      setPlayerData({ weapons:[], atributos:baseA, stats:baseS });
    }
  },[nameEntered,playerName]);
  useEffect(()=>{ loadPlayer() },[loadPlayer]);

  // ─────────────────────────────────────────────────────────────
  // SAVE PLAYER
  const savePlayer = async data => {
    setPlayerData(data);
    await setDoc(doc(db,'players',playerName),{ ...data, updatedAt:new Date() });
  };

  // ─────────────────────────────────────────────────────────────
  // HANDLERS
  const handleAtributoChange = (k,v)=>{
    savePlayer({
      ...playerData,
      atributos:{ ...playerData.atributos, [k]:v }
    });
  };
  const handleStatChange = (r,field,val)=>{
    let v = parseInt(val)||0;
    if(v<0) v=0;
    if(v>100) v=100;
    const st = { ...playerData.stats[r] };
    if(field==='base'){
      st.base = v;
      st.total = v;
      if(st.actual>v) st.actual=v;
    }
    if(field==='actual'){
      st.actual = Math.min(v, st.total+st.buff);
    }
    savePlayer({
      ...playerData,
      stats:{ ...playerData.stats, [r]:st }
    });
  };
  const handleAddBuff = (r,amount)=>{
    const st = { ...playerData.stats[r] };
    st.buff = Math.min(100 - st.total, st.buff + amount);
    savePlayer({
      ...playerData,
      stats:{ ...playerData.stats, [r]:st }
    });
  };
  const handleNerf = r=>{
    const st = { ...playerData.stats[r] };
    if(st.buff>0){
      st.buff--;
    } else {
      st.actual = Math.max(0, st.actual-1);
    }
    savePlayer({
      ...playerData,
      stats:{ ...playerData.stats, [r]:st }
    });
  };
  const handleLogin = ()=>{
    if(passwordInput===MASTER_PASSWORD){
      setAuthenticated(true);
      setShowLogin(false);
      setAuthError('');
    } else {
      setAuthError('Contraseña incorrecta');
    }
  };
  const enterPlayer = ()=>{ if(playerName.trim()) setNameEntered(true); };
  const handlePlayerEquip = ()=>{
    if(loading) return;
    const f = armas.find(a=>a.nombre.toLowerCase().includes(playerInputArma.trim().toLowerCase()));
    if(!f) return setPlayerError('Arma no encontrada');
    if(!playerData.weapons.includes(f.nombre)){
      savePlayer({ ...playerData, weapons:[...playerData.weapons,f.nombre] });
      setPlayerInputArma('');
      setPlayerError('');
    }
  };
  const handlePlayerUnequip = n=>{
    savePlayer({ ...playerData, weapons:playerData.weapons.filter(x=>x!==n) });
  };

  // ICONOS
  const dadoIcono = ()=> <BsDice6 className="inline"/>;
  const iconoDano = tipo=>{
    switch(tipo.toLowerCase()){
      case 'físico':    return <GiFist className="inline"/>;
      case 'fuego':     return <FaFire className="inline"/>;
      case 'eléctrico': return <FaBolt className="inline"/>;
      case 'hielo':     return <FaSnowflake className="inline"/>;
      case 'radiación': return <FaRadiationAlt className="inline"/>;
      default: return null;
    }
  };

  // ─────────────────────────────────────────────────────────────
  // VISTAS

  // MENÚ PRINCIPAL
  if(!userType){
    return (
      <div style={containerStyle} className="flex flex-col items-center justify-center">
        <h1 style={{fontSize:'1.5rem',marginBottom:'1rem'}}>¿Quién eres?</h1>
        <button style={buttonStyle} onClick={()=>setUserType('player')}>Soy Jugador</button>
        <button style={buttonStyle} onClick={()=>{
          setUserType('master');
          setShowLogin(true);
        }}>Soy Máster</button>
      </div>
    );
  }

  // LOGIN MÁSTER
  if(userType==='master' && showLogin && !authenticated){
    return (
      <div style={containerStyle} className="flex flex-col items-center justify-center">
        <h1 style={{fontSize:'1.5rem',marginBottom:'0.5rem'}}>Acceso Máster</h1>
        <input
          type="password"
          placeholder="Contraseña"
          value={passwordInput}
          onChange={e=>setPasswordInput(e.target.value)}
          onKeyDown={e=>e.key==='Enter'&&handleLogin()}
          style={inputStyle}
        />
        <button style={buttonStyle} onClick={handleLogin}>Entrar</button>
        {authError && <p style={{color:'#f87171'}}>{authError}</p>}
      </div>
    );
  }

  // SELECCIÓN JUGADOR
  if(userType==='player' && !nameEntered){
    return (
      <div style={containerStyle} className="flex flex-col items-center justify-center">
        <h1 style={{fontSize:'1.5rem',marginBottom:'0.5rem'}}>Selecciona tu jugador</h1>
        {existingPlayers.length>0 && (
          <div style={{marginBottom:'1rem'}}>
            <p><strong>Jugadores existentes:</strong></p>
            {existingPlayers.map(n=>(
              <button
                key={n}
                style={buttonStyle}
                onClick={()=>{
                  setPlayerName(n);
                  setTimeout(()=>setNameEntered(true),0);
                }}
              >{n}</button>
            ))}
          </div>
        )}
        <div>
          <p><strong>O crea uno nuevo:</strong></p>
          <input
            placeholder="Tu nombre"
            value={playerName}
            onChange={e=>setPlayerName(e.target.value)}
            onKeyDown={e=>e.key==='Enter'&&enterPlayer()}
            style={inputStyle}
          />
          <button style={buttonStyle} onClick={enterPlayer}>Crear / Entrar</button>
        </div>
        <button style={buttonStyle} onClick={volverAlMenu}>Volver al menú principal</button>
      </div>
    );
  }

  // FICHA JUGADOR
  if(userType==='player' && nameEntered){
    return (
      <div style={containerStyle}>
        <h1 style={{fontSize:'1.75rem',marginBottom:'1rem'}}>Ficha de {playerName}</h1>
        <div className="flex space-x-2 mb-4">
          <button style={buttonStyle} onClick={volverAlMenu}>Volver al menú</button>
          <button
            style={{...buttonStyle, backgroundColor:'#dc2626', color:'white'}}
            onClick={eliminarFichaJugador}
          >Eliminar ficha</button>
        </div>

        {/* ATRIBUTOS */}
        <h2 style={{fontSize:'1.25rem'}}>Atributos</h2>
        {atributos.map(attr=>{
          const val = playerData.atributos[attr];
          return (
            <div key={attr} style={{
              display:'flex',alignItems:'center',
              marginBottom:'1rem',
              backgroundColor:atributoColor[attr],
              padding:'0.5rem',borderRadius:'0.25rem'
            }}>
              <label style={{
                fontWeight:'bold',
                textTransform:'capitalize',
                width:'100px'
              }}>{attr}</label>
              <select
                value={val}
                onChange={e=>handleAtributoChange(attr,e.target.value)}
                style={{...inputStyle,width:'6rem',marginRight:'1rem'}}
              >
                {DADOS.map(d=><option key={d} value={d}>{d}</option>)}
              </select>
              <img
                src={dadoImgUrl(val)}
                alt={val}
                style={{height:'40px',width:'40px',objectFit:'contain'}}
              />
            </div>
          );
        })}

        {/* ESTADÍSTICAS */}
        <>
          <h2 style={{fontSize:'1.25rem',marginTop:'2rem'}}>Estadísticas</h2>
          <table style={{width:'100%',borderCollapse:'collapse',marginBottom:'2rem'}}>
            <thead>
              <tr>
                <th style={{textAlign:'left'}}>Recurso</th>
                <th>Base</th>
                <th>Total</th>
                <th>Actual</th>
                <th>Buff</th>
                <th>Nerf</th>
                <th>Barra</th>
              </tr>
            </thead>
            <tbody>
              {recursos.map(r=>{
                const s = playerData.stats[r]||{ base:0,total:0,actual:0,buff:0 };
                const b = +s.base    || 0;
                const t = +s.total   || 0;
                const a = +s.actual  || 0;
                const bf= +s.buff    || 0;
                const effTotal = Math.max(1,Math.ceil((t+bf)/3)); // columnas
                const totalEff = t+bf;
                return (
                  <tr key={r} style={{background:recursoColor[r]+'33'}}>
                    <td style={{
                      padding:'0.5rem',
                      fontWeight:'bold',
                      textTransform:'capitalize'
                    }}>{r}</td>
                    <td style={{textAlign:'center'}}>
                      <input
                        type="number" min={0} max={100}
                        value={b}
                        onChange={e=>handleStatChange(r,'base',e.target.value)}
                        style={{...inputStyle,width:'4rem'}}
                      />
                    </td>
                    <td style={{textAlign:'center',fontWeight:'bold'}}>{t}</td>
                    <td style={{textAlign:'center'}}>
                      <input
                        type="number" min={0} max={100}
                        value={a}
                        onChange={e=>handleStatChange(r,'actual',e.target.value)}
                        style={{...inputStyle,width:'4rem'}}
                      />
                    </td>
                    <td style={{textAlign:'center'}}>
                      <button
                        style={{...buttonStyle,fontSize:'0.8rem',padding:'0.3rem'}}
                        onClick={()=>{
                          const amt = parseInt(prompt('¿Cuánto buff? (1–50)'),10);
                          if(amt>0) handleAddBuff(r,amt);
                        }}
                      >+Buff</button>
                    </td>
                    <td style={{textAlign:'center'}}>
                      <button
                        style={{
                          ...buttonStyle,
                          fontSize:'0.8rem',
                          padding:'0.3rem',
                          backgroundColor:'#444',
                          color:'white'
                        }}
                        onClick={()=>handleNerf(r)}
                      >-Nerf</button>
                    </td>
                    <td>
                      <div style={{
                        display:'grid',
                        gridTemplateColumns:`repeat(${effTotal},16px)`,
                        gap:'2px'
                      }}>
                        {Array(totalEff).fill().map((_,i)=>(
                          <div key={i} style={{
                            width:'16px',
                            height:'16px',
                            background: i < a
                              ? recursoColor[r]
                              : (i < t
                                  ? recursoColor[r]+'99'
                                  : '#ff0'
                                ),
                            borderRadius:'2px'
                          }}/>
                        ))}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </>

        {/* EQUIPAR ARMA */}
        <div style={{marginBottom:'1rem'}}>
          <label>Equipa un arma:</label>
          <input
            placeholder="Escribe nombre del arma y pulsa Enter"
            value={playerInputArma}
            onChange={e=>setPlayerInputArma(e.target.value)}
            onKeyDown={e=>e.key==='Enter'&&handlePlayerEquip()}
            style={inputStyle}
          />
          {playerError && <p style={{color:'#f87171'}}>{playerError}</p>}
        </div>

        {/* ARMAS EQUIPADAS */}
        <h2 style={{fontSize:'1.25rem'}}>Armas Equipadas</h2>
        {playerData.weapons.length===0
          ? <p>No tienes armas equipadas.</p>
          : playerData.weapons.map((n,i)=>{
              const a = armas.find(x=>x.nombre===n);
              return a && (
                <div key={i} style={cardStyle}>
                  <p><strong>{a.nombre}</strong></p>
                  <p><strong>Daño:</strong> {dadoIcono()} {a.dano} {iconoDano(a.tipoDano)}</p>
                  <p><strong>Alcance:</strong> {a.alcance}</p>
                  <p><strong>Consumo:</strong> {a.consumo}</p>
                  <p><strong>Carga:</strong> {a.carga}</p>
                  <p><strong>Rasgos:</strong> {a.rasgos.join(', ')}</p>
                  {a.descripcion && <p><em>{a.descripcion}</em></p>}
                  <button
                    style={{...buttonStyle,backgroundColor:'#ef4444',color:'white'}}
                    onClick={()=>handlePlayerUnequip(a.nombre)}
                  >Desequipar</button>
                </div>
              );
            })
        }
      </div>
    );
  }

  // MODO MÁSTER (catálogo)
  if(userType==='master' && authenticated){
    return (
      <div style={containerStyle}>
        <h1 style={{fontSize:'1.75rem',marginBottom:'1rem'}}>Modo Máster</h1>
        <button style={buttonStyle} onClick={volverAlMenu}>Volver al menú principal</button>
        <button style={buttonStyle} onClick={fetchArmas}>Refrescar catálogo</button>
        {loading
          ? <p>Cargando armas…</p>
          : armas.map((a,i)=>(
              <div key={i} style={cardStyle}>
                <p><strong>{a.nombre}</strong></p>
                <p><strong>Daño:</strong> {dadoIcono()} {a.dano} {iconoDano(a.tipoDano)}</p>
                <p><strong>Alcance:</strong> {a.alcance}</p>
                <p><strong>Consumo:</strong> {a.consumo}</p>
                <p><strong>Carga:</strong> {a.carga}</p>
                <p><strong>Rasgos:</strong> {a.rasgos.join(', ')}</p>
                {a.descripcion && <p><em>{a.descripcion}</em></p>}
              </div>
            ))
        }
      </div>
    );
  }

  // FALLBACK
  return (
    <div style={containerStyle}>
      <p>Algo salió mal. Vuelve al menú.</p>
      <button style={buttonStyle} onClick={volverAlMenu}>Volver al menú</button>
    </div>
  );
}

export default App;
