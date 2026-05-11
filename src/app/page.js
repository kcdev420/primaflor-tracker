"use client";
import { useState, useEffect } from 'react';

const IMAGENES_FONDO = [
  "https://images.unsplash.com/photo-1668375827097-a867c6e72c9f?q=80&w=870&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  "https://images.unsplash.com/photo-1692606280456-b138e165b11a?q=80&w=870&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  "https://plus.unsplash.com/premium_photo-1661762342798-f87a2414d66c?q=80&w=870&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
];

const CATALOGO_COMPLETO = [
  { id: '1', cliente: "Bakkavor", palet_db: "CHEP 1x1.2 (Caja EPS 24603)", palet: "CHEP 1x1.2", caja: "EPS 24603", cajas: 50 },
  { id: '2', cliente: "Coop Norge", palet_db: "EURO CHEP 0.8x1.2 (EPS 15604)", palet: "EURO CHEP 0.8x1.2", caja: "EPS 15604", cajas: 56 },
  { id: '3', cliente: "Coop Norge", palet_db: "EURO CHEP 0.8x1.2 (EPS 21604)", palet: "EURO CHEP 0.8x1.2", caja: "EPS 21604", cajas: 44 },
  { id: '4', cliente: "Ametller", palet_db: "EURO OFICIAL 120x80 (EPS 156)", palet: "EURO OFICIAL 120x80", caja: "EPS 156", cajas: 52 },
  { id: '5', cliente: "Fruktservice", palet_db: "EURO OFICIAL (Cartón)", palet: "EURO OFICIAL", caja: "Cartón", cajas: 40 },
  { id: '6', cliente: "SIA RIMI", palet_db: "EURO 5T SUELO (IFCO 6413)", palet: "EURO 5T SUELO", caja: "IFCO 6413", cajas: 60 },
  { id: '7', cliente: "SIA RIMI", palet_db: "EURO 5T SUELO (IFCO 6415)", palet: "EURO 5T SUELO", caja: "IFCO 6415", cajas: 60 },
  { id: '8', cliente: "Primaflor", palet_db: "CHEP 1x1.2 (Azul Primaflor)", palet: "CHEP 1x1.2", caja: "Azul Primaflor", cajas: 40 },
  { id: '9', cliente: "Mimaflor", palet_db: "EURO CHEP 0.8x1.2 (CPR F6418)", palet: "EURO CHEP 0.8x1.2", caja: "CPR F6418", cajas: 52 },
  { id: '10', cliente: "RBC Pulpi", palet_db: "CHEP 1x1.2 (Plástico Blanco)", palet: "CHEP 1x1.2", caja: "Plástico Blanco", cajas: 30 }
];

const PALETERO_BASE = { nombre: '', nomina: '', ticket: '', pedido: '', configuracion: CATALOGO_COMPLETO[0] };

export default function Home() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [step, setStep] = useState(1); 
  const [bgIndex, setBgIndex] = useState(0);
  const [paletero, setPaletero] = useState(PALETERO_BASE);
  const [trabajadores, setTrabajadores] = useState([]);
  const [nuevoTrab, setNuevoTrab] = useState({ nombre: '', nomina: '', ticket: '' });

  const [isOnline, setIsOnline] = useState(true);
  const [pendientesSync, setPendientesSync] = useState(0);
  
  const [metaPedido, setMetaPedido] = useState(null); 
  const [showProgressMeta, setShowProgressMeta] = useState(false);
  const [showMaterialModal, setShowMaterialModal] = useState(false);
  const [solicitudMat, setSolicitudMat] = useState({ material: 'Gavetas de Industria', cantidad: '' });

  useEffect(() => {
    const memStep = localStorage.getItem('pf_step');
    const memPaletero = localStorage.getItem('pf_paletero');
    const memTrabajadores = localStorage.getItem('pf_trabajadores');
    const memMeta = localStorage.getItem('pf_meta');
    
    if (memStep) setStep(JSON.parse(memStep));
    if (memPaletero) setPaletero(JSON.parse(memPaletero));
    if (memTrabajadores) setTrabajadores(JSON.parse(memTrabajadores));
    if (memMeta) setMetaPedido(JSON.parse(memMeta));

    setIsOnline(navigator.onLine);
    const queueGuardada = JSON.parse(localStorage.getItem('pf_sync_queue') || '[]');
    setPendientesSync(queueGuardada.length);

    const handleOnline = () => { setIsOnline(true); sincronizarColaMongoDB(); };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', () => setIsOnline(false));
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem('pf_step', JSON.stringify(step));
      localStorage.setItem('pf_paletero', JSON.stringify(paletero));
      localStorage.setItem('pf_trabajadores', JSON.stringify(trabajadores));
      localStorage.setItem('pf_meta', JSON.stringify(metaPedido));
    }
  }, [step, paletero, trabajadores, metaPedido, isLoaded]);

  useEffect(() => {
    const intervalo = setInterval(() => { setBgIndex((prev) => (prev + 1) % IMAGENES_FONDO.length); }, 5000);
    return () => clearInterval(intervalo);
  }, []);

  const encolarPeticion = (payload) => {
    const queueActual = JSON.parse(localStorage.getItem('pf_sync_queue') || '[]');
    queueActual.push(payload);
    localStorage.setItem('pf_sync_queue', JSON.stringify(queueActual));
    setPendientesSync(queueActual.length);
  };

  const sincronizarColaMongoDB = async () => {
    const queueActual = JSON.parse(localStorage.getItem('pf_sync_queue') || '[]');
    if (queueActual.length === 0) return;
    const nuevaCola = [...queueActual];
    
    for (let i = 0; i < queueActual.length; i++) {
      try {
        await fetch('/api/tracker', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(queueActual[i]) });
        nuevaCola.shift(); 
      } catch (err) { 
        break; 
      }
    }
    localStorage.setItem('pf_sync_queue', JSON.stringify(nuevaCola));
    setPendientesSync(nuevaCola.length);
  };

  const handleConfigChange = (e) => {
    const configSeleccionada = CATALOGO_COMPLETO.find(c => c.id === e.target.value);
    setPaletero({ ...paletero, configuracion: configSeleccionada });
  };

  const handlePaleteroSubmit = async (e) => {
    e.preventDefault();
    if (paletero.nombre && paletero.nomina && paletero.ticket && paletero.pedido) {
      setIsSyncing(true);
      if (isOnline) {
        try {
          const resMeta = await fetch(`/api/pedidos?pedido=${paletero.pedido}`);
          const metaJson = await resMeta.json();
          if (metaJson.success && metaJson.data) setMetaPedido(metaJson.data.metas);

          const respuesta = await fetch(`/api/tracker?nomina=${paletero.nomina}&pedido=${paletero.pedido}`);
          const info = await respuesta.json();
          if (info.success && info.data.length > 0) {
            const cuadrillaMap = {};
            info.data.forEach(reg => {
              if (!cuadrillaMap[reg.trabajador_nomina]) cuadrillaMap[reg.trabajador_nomina] = { id: reg._id, nombre: reg.trabajador_nombre, nomina: reg.trabajador_nomina, ticket: reg.trabajador_ticket, conteos: {} };
              const configObj = CATALOGO_COMPLETO.find(c => c.palet_db === reg.tipo_palet) || CATALOGO_COMPLETO[0];
              cuadrillaMap[reg.trabajador_nomina].conteos[configObj.id] = reg.gavetas;
            });
            setTrabajadores(Object.values(cuadrillaMap));
          }
        } catch (error) { console.warn("Modo offline o error en inicio de turno."); }
      }
      setIsSyncing(false);
      setStep(2);
    }
  };

  const updateGavetas = async (id, cantidad) => {
    const configIdActual = paletero.configuracion.id;
    let trabajadorActualizado = null;
    let gavetasActualesCalculadas = 0;
    
    setTrabajadores(trabajadores.map(t => {
      if (t.id === id) {
        const gavetasAnteriores = t.conteos[configIdActual] || 0;
        let nuevoTotal = gavetasAnteriores + cantidad;
        if (nuevoTotal < 0) nuevoTotal = 0;
        gavetasActualesCalculadas = nuevoTotal;
        trabajadorActualizado = { ...t, conteos: { ...t.conteos, [configIdActual]: nuevoTotal } };
        return trabajadorActualizado;
      }
      return t;
    }));
    
    if (trabajadorActualizado) {
      const payloadEnvio = { paletero: { ...paletero, tipoPalet: paletero.configuracion.palet_db }, trabajador: trabajadorActualizado, gavetasActuales: gavetasActualesCalculadas, capacidad: paletero.configuracion.cajas };
      try {
        if (!navigator.onLine) throw new Error("Offline"); 
        await fetch('/api/tracker', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payloadEnvio) });
      } catch (error) { encolarPeticion(payloadEnvio); }
    }
  };

  const enviarAlertaMaterial = async (e) => {
    e.preventDefault();
    if (!solicitudMat.cantidad) return;
    try {
      await fetch('/api/pedidos', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          tipo: 'crear_alerta', 
          data: { 
            nombre_paletero: paletero.nombre,
            nomina_paletero: paletero.nomina, 
            pedido: paletero.pedido, 
            material: solicitudMat.material, 
            cantidad: Number(solicitudMat.cantidad) 
          } 
        })
      });
      alert(`✅ Solicitud enviada a central.`);
      setShowMaterialModal(false);
      setSolicitudMat({ ...solicitudMat, cantidad: '' });
    } catch (err) { alert("Sin conexión. Intenta de nuevo."); }
  };

  const addTrabajador = (e) => {
    e.preventDefault();
    if (trabajadores.find(t => t.nomina === nuevoTrab.nomina)) return alert(`⚠️ La nómina ya está registrada.`);
    if (nuevoTrab.nombre && nuevoTrab.nomina && nuevoTrab.ticket) {
      setTrabajadores([...trabajadores, { ...nuevoTrab, id: Date.now(), conteos: {} }]);
      setNuevoTrab({ nombre: '', nomina: '', ticket: '' }); 
    }
  };

  const removeTrabajador = (id) => setTrabajadores(trabajadores.filter(t => t.id !== id));

  const terminarTurno = () => {
    if (pendientesSync > 0) return alert("⚠️ Tienes datos sin guardar en la nube. Conéctate a internet antes de cerrar.");
    if (window.confirm("¿Estás seguro de salir y cerrar este turno?")) {
      setStep(1); setTrabajadores([]); setPaletero(PALETERO_BASE); setMetaPedido(null);
      localStorage.clear();
    }
  };

  const totalGavetasGeneral = trabajadores.reduce((acc, curr) => acc + Object.values(curr.conteos).reduce((sum, val) => sum + val, 0), 0);
  const resumenPaletsGlobales = CATALOGO_COMPLETO.map(conf => {
    const totalGavetasTipo = trabajadores.reduce((acc, t) => acc + (t.conteos[conf.id] || 0), 0);
    return { ...conf, paletsCompletos: Math.floor(totalGavetasTipo / conf.cajas) };
  });

  const opcionesSelector = CATALOGO_COMPLETO.filter(conf => {
    if (!metaPedido) return true; 
    const metaAsignada = metaPedido[conf.id];
    if (!metaAsignada || metaAsignada <= 0) return false; 
    const hecho = resumenPaletsGlobales.find(r => r.id === conf.id).paletsCompletos;
    return hecho < metaAsignada; 
  });

  useEffect(() => {
    if (step === 3 && opcionesSelector.length > 0 && !opcionesSelector.find(o => o.id === paletero.configuracion.id)) {
      setPaletero({ ...paletero, configuracion: opcionesSelector[0] });
    }
  }, [step, opcionesSelector, paletero.configuracion.id]);

  if (!isLoaded) return <div className="min-h-screen bg-black flex items-center justify-center text-white font-bold italic">Inicializando Sistema Primaflor...</div>;

  return (
    <main className="min-h-screen flex flex-col relative transition-all duration-1000 ease-in-out bg-cover bg-center bg-fixed" style={{ backgroundImage: `url(${IMAGENES_FONDO[bgIndex]})` }}>
      <div className="fixed inset-0 bg-black/60 z-0"></div>
      
      {(!isOnline || pendientesSync > 0) && (
        <div className={`fixed top-0 left-0 w-full text-center py-1.5 text-[9px] md:text-[11px] font-black uppercase tracking-widest text-white z-50 transition-colors duration-500 shadow-md backdrop-blur-sm ${!isOnline ? 'bg-orange-500/90' : 'bg-blue-500/90'}`}>
          {!isOnline ? `⚠️ Sin conexión - Trabajando localmente (${pendientesSync} pendientes)` : `🔄 Sincronizando ${pendientesSync} datos...`}
        </div>
      )}

      {step === 1 && (
        <div className="relative z-10 w-full max-w-md mx-auto flex flex-col items-center justify-center min-h-screen p-6 pb-24 pt-10">
          <div className="mb-3 w-full text-center bg-white/90 p-4 rounded-2xl shadow-lg backdrop-blur-sm border-b-4 border-[#1C4D2E]">
            <h1 className="text-[#1C4D2E] text-4xl font-black tracking-tighter">PRIMA<span className="text-[#C22821]">FLOR</span></h1>
            <p className="text-gray-600 text-sm font-bold uppercase tracking-widest">Acceso Paletero</p>
          </div>
          <form onSubmit={handlePaleteroSubmit} className="w-full bg-white/95 rounded-3xl shadow-2xl p-6 md:p-8 border-t-8 border-[#1C4D2E] backdrop-blur-md">
            <h2 className="text-[#1C4D2E] font-bold text-xl mb-6 border-b pb-2">Tus Datos de Turno</h2>
            <input type="text" placeholder="Tu Nombre" required value={paletero.nombre} onChange={(e) => setPaletero({ ...paletero, nombre: e.target.value })} className="w-full p-4 rounded-xl bg-white border-2 border-gray-300 mb-4 text-center text-lg font-bold text-[#1C4D2E] outline-none focus:border-[#1C4D2E]" />
            <input type="text" placeholder="Tu Número de Nómina" required value={paletero.nomina} onChange={(e) => setPaletero({ ...paletero, nomina: e.target.value })} className="w-full p-4 rounded-xl bg-white border-2 border-gray-300 mb-4 text-center text-lg font-bold text-[#1C4D2E] outline-none focus:border-[#1C4D2E]" />
            <input type="text" placeholder="Tu Ticket" required value={paletero.ticket} onChange={(e) => setPaletero({ ...paletero, ticket: e.target.value })} className="w-full p-4 rounded-xl bg-white border-2 border-gray-300 mb-4 text-center text-lg font-bold text-[#1C4D2E] outline-none focus:border-[#1C4D2E]" />
            <input type="text" placeholder="Número de Pedido" required value={paletero.pedido} onChange={(e) => setPaletero({ ...paletero, pedido: e.target.value })} className="w-full p-4 rounded-xl bg-green-50 border-2 border-green-300 mb-4 text-center text-lg font-black text-[#1C4D2E] outline-none focus:border-[#1C4D2E]" />
            
            <button type="submit" disabled={isSyncing} className={`w-full py-5 rounded-2xl text-white font-black text-xl shadow-lg mt-2 transition-colors ${isSyncing ? 'bg-gray-400 cursor-not-allowed' : 'bg-[#1C4D2E] hover:bg-[#153a22] active:scale-95'}`}>
              {isSyncing ? 'CARGANDO PEDIDO...' : 'CONFIGURAR CUADRILLA'}
            </button>
          </form>
        </div>
      )}

      {step === 2 && (
        <div className="relative z-10 flex flex-col p-4 pt-10 pb-24 max-w-2xl mx-auto w-full min-h-screen">
          <header className="mb-6 bg-white/95 backdrop-blur-md p-4 rounded-2xl shadow-sm border-l-4 border-[#1C4D2E]">
            <p className="text-xs text-gray-500 font-bold uppercase">Paletero en turno</p>
            <p className="text-lg font-black text-[#1C4D2E] leading-tight">{paletero.nombre}</p>
            <p className="text-sm font-bold text-gray-600 mt-1">Nómina: {paletero.nomina} | Pedido: {paletero.pedido}</p>
          </header>
          <form onSubmit={addTrabajador} className="bg-white/95 backdrop-blur-md rounded-3xl shadow-lg p-6 mb-6">
            <h2 className="text-[#1C4D2E] font-bold text-lg mb-4 flex items-center gap-2">Agregar Trabajador</h2>
            <div className="flex flex-col gap-4">
              <input type="text" placeholder="Nombre completo" required value={nuevoTrab.nombre} onChange={(e) => setNuevoTrab({ ...nuevoTrab, nombre: e.target.value })} className="p-4 bg-white rounded-xl border-2 border-gray-300 font-bold outline-none text-[#1C4D2E]" />
              <div className="flex gap-4">
                <input type="text" placeholder="Nómina" required value={nuevoTrab.nomina} onChange={(e) => setNuevoTrab({ ...nuevoTrab, nomina: e.target.value })} className="w-1/2 p-4 bg-white rounded-xl border-2 border-gray-300 font-bold outline-none text-[#1C4D2E]" />
                <input type="text" placeholder="Ticket" required value={nuevoTrab.ticket} onChange={(e) => setNuevoTrab({ ...nuevoTrab, ticket: e.target.value })} className="w-1/2 p-4 bg-white rounded-xl border-2 border-gray-300 font-bold outline-none text-[#1C4D2E]" />
              </div>
              <button type="submit" className="mt-2 py-4 bg-gray-50 border-2 border-[#1C4D2E] text-[#1C4D2E] font-black rounded-xl active:scale-95 transition-transform">AÑADIR A LA LISTA</button>
            </div>
          </form>
          <div className="flex-1">
            <h3 className="font-bold text-white mb-3 ml-2 drop-shadow-md">Tu Cuadrilla ({trabajadores.length})</h3>
            {trabajadores.map(t => (
              <div key={t.id} className="flex justify-between items-center bg-white/95 backdrop-blur-md p-4 rounded-xl shadow-sm mb-3 border-l-4 border-[#C22821]">
                <div>
                  <p className="font-black text-[#1C4D2E] text-lg">{t.nombre}</p>
                  <p className="text-sm text-gray-600 font-bold">Nómina: {t.nomina} | Ticket: {t.ticket}</p>
                </div>
                <button onClick={() => removeTrabajador(t.id)} className="text-[#C22821] font-black px-4 py-2 bg-red-50 rounded-lg active:scale-95 transition-transform">QUITAR</button>
              </div>
            ))}
          </div>
          {trabajadores.length > 0 && <button onClick={() => setStep(3)} className="w-full py-5 rounded-2xl bg-[#1C4D2E] text-white font-black text-xl mt-6 shadow-xl active:scale-95 transition-transform">INICIAR COSECHA</button>}
        </div>
      )}

      {step === 3 && (
        <div className="relative z-10 flex flex-col flex-1 max-w-2xl mx-auto w-full min-h-screen pt-6 md:pt-10 pb-10">
          <header className="bg-[#1C4D2E]/95 backdrop-blur-md p-4 md:p-6 text-white shadow-xl rounded-b-[1.5rem] md:rounded-b-[2rem] z-20 sticky top-0 border-b border-white/10 mt-2 md:mt-0">
            <div className="flex justify-between items-start mb-3 gap-2">
              <div className="truncate flex-1">
                <p className="text-[9px] md:text-[10px] opacity-70 uppercase font-bold tracking-widest leading-tight">Paletero en Turno</p>
                <p className="font-black text-xl md:text-2xl leading-none truncate">{paletero.nombre}</p>
                <p className="text-[11px] md:text-xs text-green-300 font-bold mt-1.5 leading-tight truncate">Nóm: {paletero.nomina} | Pedido: {paletero.pedido}</p>
              </div>
              <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <button onClick={terminarTurno} className="bg-red-600/90 hover:bg-red-700 text-white font-bold text-[10px] md:text-xs px-3 md:px-4 py-1.5 md:py-2 rounded-lg flex items-center gap-1.5 active:scale-95 transition-all shadow-md">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3 h-3 md:w-4 md:h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" /></svg>
                      SALIR
                  </button>
                  <div className="text-right">
                      <p className="text-5xl md:text-6xl font-black leading-none">{totalGavetasGeneral}</p>
                      <p className="text-[9px] md:text-[11px] text-green-300 font-bold uppercase tracking-wider mt-0.5 leading-tight">Gavetas Totales</p>
                  </div>
              </div>
            </div>

            {metaPedido && (
              <div className="mb-4 bg-black/20 rounded-xl border border-white/10 overflow-hidden">
                <button 
                  onClick={() => setShowProgressMeta(!showProgressMeta)}
                  className="w-full p-3 flex justify-between items-center text-[10px] font-bold uppercase tracking-wider text-green-300 hover:bg-white/5 transition-colors"
                >
                    <span className="flex items-center gap-1.5">
                      📊 {showProgressMeta ? 'Ocultar' : 'Ver'} Progreso de la Orden
                      {opcionesSelector.length === 0 && <span className="animate-pulse text-green-400">¡COMPLETO!</span>}
                    </span>
                    <span className={`transition-transform ${showProgressMeta ? 'rotate-180' : ''}`}>▼</span>
                </button>
                
                {showProgressMeta && (
                  <div className="px-3 pb-3 pt-1 border-t border-white/5 bg-black/10 flex flex-col gap-2.5">
                    {Object.entries(metaPedido).map(([idConf, meta]) => {
                      const cInfo = CATALOGO_COMPLETO.find(c => c.id === idConf);
                      const hecho = resumenPaletsGlobales.find(r => r.id === idConf)?.paletsCompletos || 0;
                      const pct = Math.min((hecho / meta) * 100, 100);
                      if (meta <= 0) return null;
                      return (
                        <div key={idConf}>
                          <div className="flex justify-between text-[10px] font-bold leading-tight mb-1 gap-2">
                            <span className="truncate w-1/2">{cInfo.cliente} ({cInfo.caja})</span>
                            <span className={`${hecho >= meta ? "text-green-400" : "text-white"} w-1/2 text-right shrink-0 font-black`}>{hecho} / {meta} Palets</span>
                          </div>
                          <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
                            <div className={`h-full transition-all duration-500 rounded-full ${hecho >= meta ? 'bg-green-400' : 'bg-amber-400'}`} style={{width: `${pct}%`}}></div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {resumenPaletsGlobales.filter(r => r.paletsCompletos > 0).length > 0 && (
              <>
                <div className="text-[9px] text-green-300 font-bold uppercase mb-1 flex items-center gap-1 opacity-70 leading-tight">→ deslice totales acumulados</div>
                <div className="mb-3 flex flex-nowrap overflow-x-auto gap-2 pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                  {resumenPaletsGlobales.filter(r => r.paletsCompletos > 0).map(res => (
                    <div key={res.id} className="shrink-0 bg-white/10 border border-white/20 px-3 py-1.5 rounded-full flex items-center gap-2 backdrop-blur-sm">
                      <span className="bg-[#C22821] text-white text-[9px] md:text-[10px] font-black px-2 py-0.5 rounded-full">{res.paletsCompletos} PALETS</span>
                      <span className="text-[9px] md:text-[10px] font-bold uppercase">{res.cliente} - {res.caja}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
            
            <div className="bg-[#153a22]/80 p-2 md:p-3 rounded-xl border border-green-700/50 backdrop-blur-sm shadow-inner">
              <p className="text-[9px] md:text-[10px] text-green-300 font-bold uppercase mb-0.5 leading-tight">Configuración Activa de Palet / Caja</p>
              {opcionesSelector.length > 0 ? (
                <select value={paletero.configuracion.id} onChange={handleConfigChange} className="w-full bg-transparent text-white font-black text-xs md:text-sm outline-none cursor-pointer appearance-none truncate">
                  {opcionesSelector.map((conf) => (
                    <option key={conf.id} value={conf.id} className="text-black">{conf.cliente} | {conf.cajas} Gv | {conf.palet} + Caja {conf.caja}</option>
                  ))}
                </select>
              ) : (
                <p className="text-[11px] md:text-sm font-black text-green-400 py-1 flex items-center gap-1.5 leading-tight">✅ ¡META DE PEDIDO COMPLETADA! (Cerrar turno al terminar)</p>
              )}
            </div>
          </header>

          <div className="flex-1 p-3 md:p-4 flex flex-col gap-4 overflow-y-auto pt-4 relative z-10">
            {trabajadores.map(t => {
              const configIdActual = paletero.configuracion.id;
              const gavetasActivas = t.conteos[configIdActual] || 0;
              const paletsTrabajador = Math.floor(gavetasActivas / (paletero.configuracion.cajas || 1));
              const gavetasEnPaletActual = gavetasActivas % (paletero.configuracion.cajas || 1);
              
              return (
                <div key={t.id} className="bg-white/95 backdrop-blur-md p-3 md:p-4 rounded-3xl shadow-lg border-2 border-white/20 flex flex-col hover:shadow-xl transition-shadow relative">
                  <div className="flex items-center justify-between border-b border-gray-200 pb-3 mb-3 gap-2">
                    <div className="w-[45%]">
                      <p className="font-black text-[#1C4D2E] leading-tight text-lg md:text-xl truncate">{t.nombre}</p>
                      <p className="text-[10px] md:text-[11px] text-gray-500 font-bold uppercase mt-1 leading-tight">Nóm: {t.nomina} | Tkt: {t.ticket}</p>
                      {paletsTrabajador > 0 && (
                        <div className="mt-2 inline-block bg-[#C22821] text-white text-[9px] md:text-[10px] px-2.5 py-1 rounded-md font-black animate-pulse shadow-md">
                          {paletsTrabajador} PALET(S) LLENO(S)
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 md:gap-2.5 w-[55%] justify-end shrink-0">
                      <button onClick={() => updateGavetas(t.id, -1)} className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-red-50 text-[#C22821] border-2 border-red-200 font-black text-3xl md:text-4xl active:scale-95 transition-transform shadow-inner">-</button>
                      <div className="w-14 md:w-16 text-center shrink-0">
                        <span className="text-4xl md:text-5xl font-black text-[#1C4D2E] leading-none">{gavetasEnPaletActual}</span>
                        <span className="text-[8px] md:text-[9px] text-gray-400 font-bold uppercase block leading-tight">En Palet</span>
                      </div>
                      <button onClick={() => updateGavetas(t.id, 1)} disabled={opcionesSelector.length === 0} className={`w-14 h-14 md:w-16 md:h-16 rounded-2xl text-white font-black text-3xl md:text-4xl shadow-lg active:scale-95 transition-transform ${opcionesSelector.length === 0 ? 'bg-gray-300 cursor-not-allowed' : 'bg-[#1C4D2E]'}`}>+</button>
                    </div>
                  </div>

                  <div className="bg-white/50 rounded-xl p-2.5 md:p-3 border border-gray-100">
                    <p className="text-[9px] md:text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1.5 border-b border-gray-200 pb-1 leading-tight">Producción Acumulada</p>
                    <div className="flex flex-col gap-1">
                      {Object.entries(t.conteos).map(([confId, cantidadGavetas]) => {
                        if (cantidadGavetas === 0) return null;
                        const configObj = CATALOGO_COMPLETO.find(c => c.id === confId);
                        return (
                          <div key={confId} className="flex justify-between items-center text-[10px] md:text-[11px] font-bold text-[#1C4D2E] gap-2">
                            <span className="truncate w-2/3 pr-1 opacity-80">{configObj.cliente} ({configObj.caja})</span>
                            <span className="w-1/3 text-right bg-green-100/80 px-2 py-1 rounded-lg shrink-0">
                              {Math.floor(cantidadGavetas / configObj.cajas)} Pal / {cantidadGavetas} Gav
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* BOTÓN SOS AL FINAL DE LA PANTALLA */}
            <div className="w-full flex justify-center mt-6 mb-12">
              <button onClick={() => setShowMaterialModal(true)} className="bg-amber-500 hover:bg-amber-600 text-white font-black text-sm md:text-base px-8 py-4 rounded-2xl shadow-lg active:scale-95 transition-all flex gap-2 items-center border-2 border-amber-300 w-full md:w-auto justify-center">
                ✋ SOLICITAR MATERIAL
              </button>
            </div>

          </div>
        </div>
      )}

      {showMaterialModal && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <form onSubmit={enviarAlertaMaterial} className="bg-white p-6 md:p-8 rounded-3xl w-full max-w-sm flex flex-col gap-4 shadow-2xl border-t-8 border-amber-500">
            <h2 className="text-xl md:text-2xl font-black text-gray-800">Pedir a Central</h2>
            <label className="text-[10px] font-bold text-gray-400 uppercase -mb-2">¿Qué necesitas?</label>
            <select value={solicitudMat.material} onChange={e => setSolicitudMat({...solicitudMat, material: e.target.value})} className="p-4 bg-gray-50 rounded-xl border-2 outline-none font-bold text-[#1C4D2E] text-sm focus:border-amber-500 transition-colors">
              <option>Gavetas de Industria</option>
              <option>Gavetas de Acarreo</option>
              <option>Palets Tratados</option>
              <option>Palets Euro Chep</option>
            </select>
            <label className="text-[10px] font-bold text-gray-400 uppercase -mb-2">¿Cuántas unidades?</label>
            <input type="number" min="1" placeholder="Ej. 100" required value={solicitudMat.cantidad} onChange={e => setSolicitudMat({...solicitudMat, cantidad: e.target.value})} className="p-4 bg-gray-50 rounded-xl border-2 outline-none font-black text-xl text-center text-[#1C4D2E] focus:border-amber-500 transition-colors" />
            <div className="flex gap-2.5 mt-2">
              <button type="button" onClick={() => setShowMaterialModal(false)} className="w-1/3 py-4 bg-gray-200 text-gray-600 font-black rounded-xl text-sm active:scale-95 transition-transform">Cancelar</button>
              <button type="submit" className="w-2/3 py-4 bg-amber-500 text-white font-black rounded-xl shadow-lg hover:bg-amber-600 text-sm active:scale-95 transition-transform">Enviar Alerta</button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}