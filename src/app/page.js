"use client";
import { useState } from 'react';

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

export default function Home() {
  const [step, setStep] = useState(1); 
  const [paletero, setPaletero] = useState({ 
    nomina: '', ticket: '', pedido: '', configuracion: CATALOGO_CONFIGURACIONES[0] 
  });
  const [trabajadores, setTrabajadores] = useState([]);
  const [nuevoTrab, setNuevoTrab] = useState({ nombre: '', nomina: '', ticket: '' });

  const handleConfigChange = (e) => {
    const configSeleccionada = CATALOGO_CONFIGURACIONES.find(c => c.id === e.target.value);
    setPaletero({ ...paletero, configuracion: configSeleccionada });
  };

  const handlePaleteroSubmit = async (e) => {
    e.preventDefault();
    if (paletero.nomina && paletero.ticket && paletero.pedido) {
      try {
        const respuesta = await fetch(`/api/tracker?nomina=${paletero.nomina}&pedido=${paletero.pedido}`);
        const info = await respuesta.json();

        if (info.success && info.data.length > 0) {
          // LÓGICA DE AGRUPACIÓN PARA RECUPERAR MÚLTIPLES PALETS
          const cuadrillaMap = {};
          info.data.forEach(reg => {
            if (!cuadrillaMap[reg.trabajador_nomina]) {
              cuadrillaMap[reg.trabajador_nomina] = {
                id: reg._id, nombre: reg.trabajador_nombre, nomina: reg.trabajador_nomina, ticket: reg.trabajador_ticket,
                conteos: {} // Aquí guardaremos los conteos por cada ID de configuración
              };
            }
            const configObj = CATALOGO_CONFIGURACIONES.find(c => c.palet === reg.tipo_palet) || CATALOGO_CONFIGURACIONES[0];
            cuadrillaMap[reg.trabajador_nomina].conteos[configObj.id] = reg.gavetas;
          });
          
          setTrabajadores(Object.values(cuadrillaMap));
          alert(`✅ ¡Turno recuperado con todo el histórico de palets!`);
        }
      } catch (error) { console.error("Error al buscar:", error); }
      setStep(2);
    } else { alert("Por favor llena todos los datos"); }
  };

  const addTrabajador = (e) => {
    e.preventDefault();
    const existeNomina = trabajadores.find(t => t.nomina === nuevoTrab.nomina);
    if (existeNomina) return alert(`⚠️ La nómina ${nuevoTrab.nomina} ya está registrada.`);
    if (nuevoTrab.nombre && nuevoTrab.nomina && nuevoTrab.ticket) {
      // Inicializamos con un objeto "conteos" vacío
      setTrabajadores([...trabajadores, { ...nuevoTrab, id: Date.now(), conteos: {} }]);
      setNuevoTrab({ nombre: '', nomina: '', ticket: '' }); 
    }
  };

  const removeTrabajador = (id) => setTrabajadores(trabajadores.filter(t => t.id !== id));

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
      try {
        await fetch('/api/tracker', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            paletero: { ...paletero, tipoPalet: paletero.configuracion.palet }, 
            trabajador: trabajadorActualizado, 
            gavetasActuales: gavetasActualesCalculadas, // Mandamos solo las gavetas del palet actual
            capacidad: paletero.configuracion.cajas
          }),
        });
      } catch (error) { console.error("Error al guardar:", error); }
    }
  };

  const terminarTurno = () => {
    if (window.confirm("¿Estás seguro de terminar y cerrar este turno?")) {
      setStep(1); setTrabajadores([]);
      setPaletero({ nomina: '', ticket: '', pedido: '', configuracion: CATALOGO_CONFIGURACIONES[0] });
    }
  };

  // --- VISTA 1 Y 2 SON IGUALES (Ocultas por brevedad, el código incluye las vistas completas) ---
  if (step === 1) {
    return (
      <main className="min-h-screen bg-[#F4F7F5] flex flex-col items-center p-6">
        <div className="mb-8 mt-4 text-center">
          <h1 className="text-[#1C4D2E] text-4xl font-black tracking-tighter">PRIMA<span className="text-[#C22821]">FLOR</span></h1>
          <p className="text-gray-500 text-sm font-bold uppercase tracking-widest">Acceso Paletero</p>
        </div>
        <form onSubmit={handlePaleteroSubmit} className="w-full max-w-md bg-white rounded-3xl shadow-xl p-8 border-t-8 border-[#1C4D2E]">
          <h2 className="text-[#1C4D2E] font-bold text-xl mb-6 border-b pb-2">Tus Datos de Turno</h2>
          <input type="text" placeholder="Tu Número de Nómina" required value={paletero.nomina} onChange={(e) => setPaletero({ ...paletero, nomina: e.target.value })} className="w-full p-4 rounded-xl bg-white border-2 border-gray-300 mb-4 text-center text-lg font-bold text-[#1C4D2E] outline-none" />
          <input type="text" placeholder="Tu Ticket" required value={paletero.ticket} onChange={(e) => setPaletero({ ...paletero, ticket: e.target.value })} className="w-full p-4 rounded-xl bg-white border-2 border-gray-300 mb-4 text-center text-lg font-bold text-[#1C4D2E] outline-none" />
          <input type="text" placeholder="Número de Pedido" required value={paletero.pedido} onChange={(e) => setPaletero({ ...paletero, pedido: e.target.value })} className="w-full p-4 rounded-xl bg-white border-2 border-gray-300 mb-4 text-center text-lg font-bold text-[#1C4D2E] outline-none" />

          <label className="block text-gray-600 text-sm font-bold mb-2 mt-4">Configuración Inicial del Pedido</label>
          <select value={paletero.configuracion.id} onChange={handleConfigChange} className="w-full p-4 rounded-xl bg-white border-2 border-[#1C4D2E] mb-2 text-sm font-bold text-[#1C4D2E] outline-none">
            {CATALOGO_CONFIGURACIONES.map((conf) => (
              <option key={conf.id} value={conf.id}>{conf.cliente} | {conf.cajas} CJ | {conf.palet}</option>
            ))}
          </select>
          <button type="submit" className="w-full py-5 rounded-2xl bg-[#1C4D2E] text-white font-black text-xl shadow-lg mt-6">CONFIGURAR CUADRILLA</button>
        </form>
      </main>
    );
  }

  if (step === 2) {
    return (
      <main className="min-h-screen bg-[#F4F7F5] p-4 flex flex-col max-w-2xl mx-auto w-full">
        <header className="mb-6 bg-white p-4 rounded-2xl shadow-sm border-l-4 border-[#1C4D2E]">
          <p className="text-xs text-gray-500 font-bold uppercase">Paletero en turno</p>
          <p className="text-lg font-black text-[#1C4D2E]">Nómina: {paletero.nomina} | Pedido: {paletero.pedido}</p>
        </header>
        <form onSubmit={addTrabajador} className="bg-white rounded-3xl shadow-lg p-6 mb-6">
          <h2 className="text-[#1C4D2E] font-bold text-lg mb-4 flex items-center gap-2">Agregar Trabajador</h2>
          <div className="flex flex-col gap-4">
            <input type="text" placeholder="Nombre completo" required value={nuevoTrab.nombre} onChange={(e) => setNuevoTrab({ ...nuevoTrab, nombre: e.target.value })} className="p-4 bg-white rounded-xl border-2 border-gray-300 font-bold outline-none text-[#1C4D2E]" />
            <div className="flex gap-4">
              <input type="text" placeholder="Nómina" required value={nuevoTrab.nomina} onChange={(e) => setNuevoTrab({ ...nuevoTrab, nomina: e.target.value })} className="w-1/2 p-4 bg-white rounded-xl border-2 border-gray-300 font-bold outline-none text-[#1C4D2E]" />
              <input type="text" placeholder="Ticket" required value={nuevoTrab.ticket} onChange={(e) => setNuevoTrab({ ...nuevoTrab, ticket: e.target.value })} className="w-1/2 p-4 bg-white rounded-xl border-2 border-gray-300 font-bold outline-none text-[#1C4D2E]" />
            </div>
            <button type="submit" className="mt-2 py-4 bg-[#F4F7F5] border-2 border-[#1C4D2E] text-[#1C4D2E] font-black rounded-xl">AÑADIR A LA LISTA</button>
          </div>
        </form>
        <div className="flex-1">
          <h3 className="font-bold text-gray-600 mb-3 ml-2">Tu Cuadrilla ({trabajadores.length})</h3>
          {trabajadores.map(t => (
            <div key={t.id} className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm mb-3 border-l-4 border-[#C22821]">
              <div>
                <p className="font-black text-[#1C4D2E] text-lg">{t.nombre}</p>
                <p className="text-sm text-gray-600 font-bold">Nómina: {t.nomina} | Ticket: {t.ticket}</p>
              </div>
              <button onClick={() => removeTrabajador(t.id)} className="text-[#C22821] font-black px-4 py-2 bg-red-50 rounded-lg">QUITAR</button>
            </div>
          ))}
        </div>
        {trabajadores.length > 0 && <button onClick={() => setStep(3)} className="w-full py-5 rounded-2xl bg-[#1C4D2E] text-white font-black text-xl mt-6">INICIAR COSECHA</button>}
      </main>
    );
  }

  // --- VISTA 3: TRACKING Y DESGLOSE ---
  return (
    <main className="min-h-screen bg-[#F4F7F5] flex flex-col max-w-2xl mx-auto w-full">
      <header className="bg-[#1C4D2E] p-6 text-white shadow-xl rounded-b-[2rem] z-10 sticky top-0">
        <div className="flex justify-between items-start mb-4">
          <div>
            <p className="text-[10px] opacity-70 uppercase font-bold tracking-widest">Nómina Paletero</p>
            <p className="font-black text-2xl">{paletero.nomina}</p>
            <p className="text-sm text-green-300 font-bold mt-1">Pedido: {paletero.pedido}</p>
          </div>
        </div>
        <div className="bg-[#153a22] p-3 rounded-xl border border-green-700">
          <p className="text-[10px] text-green-300 font-bold uppercase mb-1">Configuración Activa (Selector)</p>
          <select value={paletero.configuracion.id} onChange={handleConfigChange} className="w-full bg-transparent text-white font-bold text-sm outline-none cursor-pointer">
            {CATALOGO_CONFIGURACIONES.map((conf) => (
              <option key={conf.id} value={conf.id} className="text-black">{conf.cliente} | {conf.cajas} Gavetas | {conf.palet}</option>
            ))}
          </select>
        </div>
      </header>

      <div className="flex-1 p-4 flex flex-col gap-4 overflow-y-auto pt-6 pb-20">
        {trabajadores.map(t => {
          const configIdActual = paletero.configuracion.id;
          const gavetasActivas = t.conteos[configIdActual] || 0;
          
          const paletsTrabajador = Math.floor(gavetasActivas / paletero.configuracion.cajas);
          const gavetasEnPaletActual = gavetasActivas % paletero.configuracion.cajas;
          
          return (
            <div key={t.id} className="bg-white p-4 rounded-3xl shadow-md border-2 border-gray-100 flex flex-col">
              {/* Parte Superior: Nombres y Botones */}
              <div className="flex items-center justify-between border-b pb-4 mb-4">
                <div className="w-[40%]">
                  <p className="font-black text-[#1C4D2E] leading-tight text-xl">{t.nombre}</p>
                  <p className="text-[11px] text-gray-500 font-bold uppercase mt-1">Nóm: {t.nomina} | Tkt: {t.ticket}</p>
                  
                  {paletsTrabajador > 0 && (
                    <div className="mt-2 inline-block bg-[#C22821] text-white text-[10px] px-2 py-1 rounded-md font-bold animate-pulse">
                      {paletsTrabajador} PALET(S) COMPLETOS
                    </div>
                  )}
                </div>
                
                <div className="flex items-center gap-2 w-[60%] justify-end">
                  <button onClick={() => updateGavetas(t.id, -1)} className="w-14 h-14 rounded-2xl bg-red-50 text-[#C22821] border-2 border-red-200 font-black text-3xl">-</button>
                  <div className="w-16 text-center flex flex-col">
                    <span className="text-4xl font-black text-[#1C4D2E]">{gavetasEnPaletActual}</span>
                    <span className="text-[9px] text-gray-400 font-bold uppercase">En Palet</span>
                  </div>
                  <button onClick={() => updateGavetas(t.id, 1)} className="w-16 h-16 rounded-2xl bg-[#1C4D2E] text-white font-black text-4xl shadow-lg">+</button>
                </div>
              </div>

              {/* DESGLOSE HISTÓRICO: Muestra todos los palets que ha tocado en el pedido */}
              <div className="bg-gray-50 rounded-xl p-3 border border-gray-200">
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-2 border-b pb-1">Desglose de Producción</p>
                {Object.keys(t.conteos).length === 0 ? (
                  <p className="text-xs text-gray-400 font-bold italic">Sin producción registrada</p>
                ) : (
                  Object.entries(t.conteos).map(([confId, cantidadGavetas]) => {
                    if (cantidadGavetas === 0) return null;
                    const configObj = CATALOGO_CONFIGURACIONES.find(c => c.id === confId);
                    const paletsListosDeEsteTipo = Math.floor(cantidadGavetas / configObj.cajas);
                    
                    return (
                      <div key={confId} className="flex justify-between items-center text-xs font-bold text-[#1C4D2E] mb-1">
                        <span className="truncate w-[65%]">{configObj.cliente} ({configObj.palet})</span>
                        <span className="w-[35%] text-right bg-green-100 px-2 py-1 rounded text-[#1C4D2E]">
                          {paletsListosDeEsteTipo} Pal / {cantidadGavetas} Gav
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="p-6 bg-white border-t-2 border-gray-100 shadow-[0_-10px_15px_-3px_rgba(0,0,0,0.05)]">
         <button onClick={terminarTurno} className="w-full py-5 rounded-2xl bg-gray-800 text-white font-black text-lg shadow-lg">
            TERMINAR Y CERRAR TURNO
         </button>
      </div>
    </main>
  );
}