"use client";
import { useState, useEffect } from 'react';

const IMAGENES_FONDO = [
  "https://images.unsplash.com/photo-1668375827097-a867c6e72c9f?q=80&w=870&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  "https://images.unsplash.com/photo-1692606280456-b138e165b11a?q=80&w=870&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  "https://plus.unsplash.com/premium_photo-1661762342798-f87a2414d66c?q=80&w=870&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
];

const CATALOGO_CONFIGURACIONES = [
  { id: '1', cliente: "Bakkavor", palet: "CHEP 1x1.2 (Caja EPS 24603)", cajas: 50, lechugas: 18 },
  { id: '2', cliente: "Coop Norge", palet: "EURO CHEP 0.8x1.2 (EPS 15604)", cajas: 56, lechugas: 10 },
  { id: '3', cliente: "Coop Norge", palet: "EURO CHEP 0.8x1.2 (EPS 21604)", cajas: 44, lechugas: 18 },
  { id: '4', cliente: "Ametller", palet: "EURO OFICIAL 120x80 (EPS 156)", cajas: 52, lechugas: 9 },
  { id: '5', cliente: "Fruktservice", palet: "EURO OFICIAL (Cartón)", cajas: 40, lechugas: 8 },
  { id: '6', cliente: "SIA RIMI", palet: "EURO 5T SUELO (IFCO 6413)", cajas: 60, lechugas: 10 },
  { id: '7', cliente: "SIA RIMI", palet: "EURO 5T SUELO (IFCO 6415)", cajas: 60, lechugas: 15 },
  { id: '8', cliente: "Primaflor", palet: "CHEP 1x1.2 (Azul Primaflor)", cajas: 40, lechugas: 100 },
  { id: '9', cliente: "Mimaflor", palet: "EURO CHEP 0.8x1.2 (CPR F6418)", cajas: 52, lechugas: 10 },
  { id: '10', cliente: "RBC Pulpi", palet: "CHEP 1x1.2 (Plástico Blanco)", cajas: 30, lechugas: 1 }
];

const PALETERO_BASE = { nomina: '', ticket: '', pedido: '', configuracion: CATALOGO_CONFIGURACIONES[0] };

export default function Home() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [step, setStep] = useState(1); 
  const [bgIndex, setBgIndex] = useState(0);
  const [paletero, setPaletero] = useState(PALETERO_BASE);
  const [trabajadores, setTrabajadores] = useState([]);
  const [nuevoTrab, setNuevoTrab] = useState({ nombre: '', nomina: '', ticket: '' });

  // FASES 2 Y 3: ESTADOS DEL SENSOR DE RED Y COLA DE DATOS
  const [isOnline, setIsOnline] = useState(true);
  const [pendientesSync, setPendientesSync] = useState(0);

  // EFECTO INICIAL: Recuperación Visual y Configuración de Sensores
  useEffect(() => {
    // 1. Recuperar variables visuales de Fase 1
    const memStep = localStorage.getItem('pf_step');
    const memPaletero = localStorage.getItem('pf_paletero');
    const memTrabajadores = localStorage.getItem('pf_trabajadores');
    
    if (memStep) setStep(JSON.parse(memStep));
    if (memPaletero) setPaletero(JSON.parse(memPaletero));
    if (memTrabajadores) setTrabajadores(JSON.parse(memTrabajadores));

    // 2. Configurar el Sensor de Red
    setIsOnline(navigator.onLine);
    const queueGuardada = JSON.parse(localStorage.getItem('pf_sync_queue') || '[]');
    setPendientesSync(queueGuardada.length);

    const handleOnline = () => {
      setIsOnline(true);
      sincronizarColaMongoDB(); // Se dispara automáticamente al volver la red
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    setIsLoaded(true);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // FASE 1 CONTINUACIÓN: Guardar cambios visuales
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem('pf_step', JSON.stringify(step));
      localStorage.setItem('pf_paletero', JSON.stringify(paletero));
      localStorage.setItem('pf_trabajadores', JSON.stringify(trabajadores));
    }
  }, [step, paletero, trabajadores, isLoaded]);

  // ANIMACIÓN CARRUSEL DE FONDO
  useEffect(() => {
    const intervalo = setInterval(() => {
      setBgIndex((prev) => (prev + 1) % IMAGENES_FONDO.length);
    }, 5000);
    return () => clearInterval(intervalo);
  }, []);

  // -------------------------------------------------------------
  // LÓGICA DE MOTOR OFFLINE
  // -------------------------------------------------------------
  const encolarPeticion = (payload) => {
    const queueActual = JSON.parse(localStorage.getItem('pf_sync_queue') || '[]');
    queueActual.push(payload);
    localStorage.setItem('pf_sync_queue', JSON.stringify(queueActual));
    setPendientesSync(queueActual.length);
  };

  const sincronizarColaMongoDB = async () => {
    const queueActual = JSON.parse(localStorage.getItem('pf_sync_queue') || '[]');
    if (queueActual.length === 0) return;

    // Clonamos la cola para ir borrando lo que se envíe exitosamente
    const nuevaCola = [...queueActual];

    for (let i = 0; i < queueActual.length; i++) {
      try {
        const res = await fetch('/api/tracker', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(queueActual[i])
        });
        
        if (res.ok) {
          nuevaCola.shift(); // Enviado con éxito, lo borramos de la cola local
        } else {
          break; // Si el servidor rechaza, nos detenemos y probamos luego
        }
      } catch (err) {
        break; // Si la red vuelve a caer en medio del proceso, nos detenemos
      }
    }

    localStorage.setItem('pf_sync_queue', JSON.stringify(nuevaCola));
    setPendientesSync(nuevaCola.length);
  };
  // -------------------------------------------------------------

  const handleConfigChange = (e) => {
    const configSeleccionada = CATALOGO_CONFIGURACIONES.find(c => c.id === e.target.value);
    setPaletero({ ...paletero, configuracion: configSeleccionada });
  };

  const handlePaleteroSubmit = async (e) => {
    e.preventDefault();
    if (paletero.nomina && paletero.ticket && paletero.pedido) {
      if (isOnline) {
        try {
          const respuesta = await fetch(`/api/tracker?nomina=${paletero.nomina}&pedido=${paletero.pedido}`);
          const info = await respuesta.json();
          
          if (info.success && info.data.length > 0) {
            const cuadrillaMap = {};
            info.data.forEach(reg => {
              if (!cuadrillaMap[reg.trabajador_nomina]) {
                cuadrillaMap[reg.trabajador_nomina] = {
                  id: reg._id, nombre: reg.trabajador_nombre, nomina: reg.trabajador_nomina, ticket: reg.trabajador_ticket,
                  conteos: {}
                };
              }
              const configObj = CATALOGO_CONFIGURACIONES.find(c => c.palet === reg.tipo_palet) || CATALOGO_CONFIGURACIONES[0];
              cuadrillaMap[reg.trabajador_nomina].conteos[configObj.id] = reg.gavetas;
            });
            setTrabajadores(Object.values(cuadrillaMap));
          }
        } catch (error) { console.warn("Modo offline en inicio de turno."); }
      }
      setStep(2);
    }
  };

  const updateGavetas = async (id, cantidad) => {
    const configIdActual = paletero.configuracion.id;
    let trabajadorActualizado = null;
    let gavetasActualesCalculadas = 0;
    
    // 1. Actualizamos la pantalla instantáneamente (sin esperar a la red)
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
    
    // 2. Intentamos enviar a MongoDB o lo encolamos si no hay red
    if (trabajadorActualizado) {
      const payloadEnvio = { 
        paletero: { ...paletero, tipoPalet: paletero.configuracion.palet }, 
        trabajador: trabajadorActualizado, 
        gavetasActuales: gavetasActualesCalculadas,
        capacidad: paletero.configuracion.cajas
      };

      try {
        if (!navigator.onLine) throw new Error("Offline_Trigger"); // Si detecta que no hay red, salta al Catch
        
        const res = await fetch('/api/tracker', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payloadEnvio),
        });

        if (!res.ok) throw new Error("Server_Error");

      } catch (error) { 
        // Si falló el Fetch o detectó Offline, empujamos a la cola de espera
        encolarPeticion(payloadEnvio);
      }
    }
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
    if (pendientesSync > 0) {
      return alert("⚠️ Tienes datos sin guardar en la nube. Conéctate a internet para sincronizar antes de cerrar el turno.");
    }

    if (window.confirm("¿Estás seguro de salir y cerrar este turno?")) {
      setStep(1); 
      setTrabajadores([]); 
      setPaletero(PALETERO_BASE);
      localStorage.removeItem('pf_step'); 
      localStorage.removeItem('pf_paletero'); 
      localStorage.removeItem('pf_trabajadores');
      localStorage.removeItem('pf_sync_queue');
    }
  };

  // CÁLCULOS GLOBALES
  const totalGavetasGeneral = trabajadores.reduce((acc, curr) => {
    return acc + Object.values(curr.conteos).reduce((sum, val) => sum + val, 0);
  }, 0);

  const resumenPaletsGlobales = CATALOGO_CONFIGURACIONES.map(conf => {
    const totalGavetasTipo = trabajadores.reduce((acc, t) => acc + (t.conteos[conf.id] || 0), 0);
    const paletsCompletos = Math.floor(totalGavetasTipo / conf.cajas);
    return { ...conf, paletsCompletos };
  }).filter(res => res.paletsCompletos > 0);

  if (!isLoaded) return <div className="min-h-screen bg-black/90 flex items-center justify-center text-white font-bold italic">Inicializando Sistema Primaflor...</div>;

  return (
    <main className="min-h-screen flex flex-col relative transition-all duration-1000 ease-in-out bg-cover bg-center bg-fixed" style={{ backgroundImage: `url(${IMAGENES_FONDO[bgIndex]})` }}>
      <div className="fixed inset-0 bg-black/60 z-0"></div>
      
      {/* --- TELEMETRÍA VISUAL (BANNER DE CONEXIÓN) --- */}
      {(!isOnline || pendientesSync > 0) && (
        <div className={`fixed top-0 left-0 w-full text-center py-1.5 text-[9px] md:text-[11px] font-black uppercase tracking-widest text-white z-50 transition-colors duration-500 shadow-md backdrop-blur-sm ${!isOnline ? 'bg-orange-500/90' : 'bg-blue-500/90'}`}>
          {!isOnline ? `⚠️ Sin conexión - Trabajando localmente (${pendientesSync} pendientes)` : `🔄 Restableciendo conexión... Sincronizando ${pendientesSync} datos...`}
        </div>
      )}

      {/* VISTA 1: ACCESO */}
      {step === 1 && (
        <div className="relative z-10 w-full max-w-md mx-auto flex flex-col items-center justify-center min-h-screen p-6 pb-24 pt-10">
          <div className="mb-3 w-full text-center bg-white/90 p-4 rounded-2xl shadow-lg backdrop-blur-sm border-b-4 border-[#1C4D2E]">
            <h1 className="text-[#1C4D2E] text-4xl font-black tracking-tighter">PRIMA<span className="text-[#C22821]">FLOR</span></h1>
            <p className="text-gray-600 text-sm font-bold uppercase tracking-widest">Acceso Paletero</p>
          </div>
          <form onSubmit={handlePaleteroSubmit} className="w-full bg-white/95 rounded-3xl shadow-2xl p-6 md:p-8 border-t-8 border-[#1C4D2E] backdrop-blur-md">
            <h2 className="text-[#1C4D2E] font-bold text-xl mb-6 border-b pb-2">Tus Datos de Turno</h2>
            <input type="text" placeholder="Tu Número de Nómina" required value={paletero.nomina} onChange={(e) => setPaletero({ ...paletero, nomina: e.target.value })} className="w-full p-4 rounded-xl bg-white border-2 border-gray-300 mb-4 text-center text-lg font-bold text-[#1C4D2E] outline-none focus:border-[#1C4D2E]" />
            <input type="text" placeholder="Tu Ticket" required value={paletero.ticket} onChange={(e) => setPaletero({ ...paletero, ticket: e.target.value })} className="w-full p-4 rounded-xl bg-white border-2 border-gray-300 mb-4 text-center text-lg font-bold text-[#1C4D2E] outline-none focus:border-[#1C4D2E]" />
            <input type="text" placeholder="Número de Pedido" required value={paletero.pedido} onChange={(e) => setPaletero({ ...paletero, pedido: e.target.value })} className="w-full p-4 rounded-xl bg-white border-2 border-gray-300 mb-4 text-center text-lg font-bold text-[#1C4D2E] outline-none focus:border-[#1C4D2E]" />
            <label className="block text-gray-600 text-sm font-bold mb-2 mt-4">Configuración del Pedido</label>
            <select value={paletero.configuracion.id} onChange={handleConfigChange} className="w-full p-4 rounded-xl bg-white border-2 border-[#1C4D2E] mb-2 text-sm font-bold text-[#1C4D2E] outline-none">
              {CATALOGO_CONFIGURACIONES.map((conf) => (
                <option key={conf.id} value={conf.id}>{conf.cliente} | {conf.cajas} CJ | {conf.palet}</option>
              ))}
            </select>
            <button type="submit" className="w-full py-5 rounded-2xl bg-[#1C4D2E] text-white font-black text-xl shadow-lg mt-6 hover:bg-[#153a22] transition-colors">CONFIGURAR CUADRILLA</button>
          </form>
        </div>
      )}

      {/* VISTA 2: CONFIGURAR CUADRILLA */}
      {step === 2 && (
        <div className="relative z-10 flex flex-col p-4 pt-10 pb-24 max-w-2xl mx-auto w-full min-h-screen">
          <header className="mb-6 bg-white/95 backdrop-blur-md p-4 rounded-2xl shadow-sm border-l-4 border-[#1C4D2E]">
            <p className="text-xs text-gray-500 font-bold uppercase">Paletero en turno</p>
            <p className="text-lg font-black text-[#1C4D2E]">Nómina: {paletero.nomina} | Pedido: {paletero.pedido}</p>
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

      {/* VISTA 3: TRACKER */}
      {step === 3 && (
        <div className="relative z-10 flex flex-col flex-1 max-w-2xl mx-auto w-full min-h-screen pt-6">
          <header className="bg-[#1C4D2E]/95 backdrop-blur-md p-6 text-white shadow-xl rounded-b-[2rem] z-20 sticky top-0 border-b border-white/10 mt-2 md:mt-0">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-[10px] opacity-70 uppercase font-bold tracking-widest">Nómina Paletero</p>
                <p className="font-black text-2xl leading-none">{paletero.nomina}</p>
                <p className="text-xs text-green-300 font-bold mt-1.5">Pedido: {paletero.pedido}</p>
              </div>
              <div className="flex flex-col items-end gap-2">
                  <button onClick={terminarTurno} className="bg-red-600/90 hover:bg-red-700 text-white font-bold text-xs px-4 py-2 rounded-lg flex items-center gap-1.5 active:scale-95 transition-all shadow-md">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" /></svg>
                      SALIR
                  </button>
                  <div className="text-right">
                      <p className="text-6xl font-black leading-none">{totalGavetasGeneral}</p>
                      <p className="text-xs text-green-300 font-bold uppercase tracking-wider mt-1">Gavetas Totales</p>
                  </div>
              </div>
            </div>

            {resumenPaletsGlobales.length > 0 && (
              <div className="mb-4 flex flex-wrap gap-2">
                {resumenPaletsGlobales.map(res => (
                  <div key={res.id} className="bg-white/10 border border-white/20 px-3 py-1.5 rounded-full flex items-center gap-2 backdrop-blur-sm">
                    <span className="bg-[#C22821] text-white text-[10px] font-black px-2 py-0.5 rounded-full">{res.paletsCompletos} PALETS</span>
                    <span className="text-[10px] font-bold uppercase truncate max-w-[100px]">{res.cliente}</span>
                  </div>
                ))}
              </div>
            )}
            
            <div className="bg-[#153a22]/80 p-3 rounded-xl border border-green-700/50 backdrop-blur-sm">
              <p className="text-[10px] text-green-300 font-bold uppercase mb-1">Configuración Activa (Selector)</p>
              <select value={paletero.configuracion.id} onChange={handleConfigChange} className="w-full bg-transparent text-white font-bold text-sm outline-none cursor-pointer appearance-none">
                {CATALOGO_CONFIGURACIONES.map((conf) => (
                  <option key={conf.id} value={conf.id} className="text-black">{conf.cliente} | {conf.cajas} Gavetas | {conf.palet}</option>
                ))}
              </select>
            </div>
          </header>

          <div className="flex-1 p-4 flex flex-col gap-4 overflow-y-auto pt-6 pb-24">
            {trabajadores.map(t => {
              const configIdActual = paletero.configuracion.id;
              const gavetasActivas = t.conteos[configIdActual] || 0;
              const paletsTrabajador = Math.floor(gavetasActivas / paletero.configuracion.cajas);
              const gavetasEnPaletActual = gavetasActivas % paletero.configuracion.cajas;
              
              return (
                <div key={t.id} className="bg-white/95 backdrop-blur-md p-4 rounded-3xl shadow-lg border-2 border-white/20 flex flex-col hover:shadow-xl transition-shadow relative z-10">
                  <div className="flex items-center justify-between border-b border-gray-200 pb-4 mb-4">
                    <div className="w-[45%]">
                      <p className="font-black text-[#1C4D2E] leading-tight text-xl">{t.nombre}</p>
                      <p className="text-[11px] text-gray-500 font-bold uppercase mt-1">Nóm: {t.nomina} | Tkt: {t.ticket}</p>
                      {paletsTrabajador > 0 && (
                        <div className="mt-2 inline-block bg-[#C22821] text-white text-[10px] px-2 py-1 rounded-md font-bold animate-pulse shadow-md">
                          {paletsTrabajador} PALET(S) COMPLETOS
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 w-[55%] justify-end">
                      <button onClick={() => updateGavetas(t.id, -1)} className="w-14 h-14 rounded-2xl bg-red-50 text-[#C22821] border-2 border-red-200 font-black text-3xl active:scale-95 transition-transform">-</button>
                      <div className="w-16 text-center shrink-0">
                        <span className="text-4xl font-black text-[#1C4D2E]">{gavetasEnPaletActual}</span>
                        <span className="text-[9px] text-gray-400 font-bold uppercase block">En Palet</span>
                      </div>
                      <button onClick={() => updateGavetas(t.id, 1)} className="w-16 h-16 rounded-2xl bg-[#1C4D2E] text-white font-black text-4xl shadow-lg active:scale-95 transition-transform">+</button>
                    </div>
                  </div>

                  <div className="bg-white/50 rounded-xl p-3 border border-gray-100">
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-2 border-b border-gray-200 pb-1">Producción Acumulada</p>
                    {Object.entries(t.conteos).map(([confId, cantidadGavetas]) => {
                      if (cantidadGavetas === 0) return null;
                      const configObj = CATALOGO_CONFIGURACIONES.find(c => c.id === confId);
                      return (
                        <div key={confId} className="flex justify-between items-center text-[11px] font-bold text-[#1C4D2E] mb-1.5 gap-2">
                          <span className="truncate w-[65%] pr-1">{configObj.cliente} ({configObj.palet})</span>
                          <span className="w-[35%] text-right bg-green-100/80 px-2.5 py-1.5 rounded-lg shrink-0">
                            {Math.floor(cantidadGavetas / configObj.cajas)} Pal / {cantidadGavetas} Gav
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </main>
  );
}