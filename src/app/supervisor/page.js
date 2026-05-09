"use client";
import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

export default function SupervisorDashboard() {
  const [datos, setDatos] = useState([]);
  const [loading, setLoading] = useState(true);

  const [filtroPaletero, setFiltroPaletero] = useState('TODOS');
  const [filtroPedido, setFiltroPedido] = useState('TODOS');

  const fetchDatos = async () => {
    try {
      const res = await fetch('/api/tracker');
      const json = await res.json();
      if (json.success) {
        setDatos(json.data);
      }
    } catch (error) {
      console.error("Error cargando dashboard:", error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchDatos();
    const interval = setInterval(fetchDatos, 5000); 
    return () => clearInterval(interval);
  }, []);

  const paleterosUnicos = ['TODOS', ...new Set(datos.map(d => d.paletero_nomina))];
  const pedidosUnicos = ['TODOS', ...new Set(datos.map(d => d.pedido))];

  const datosFiltrados = datos.filter(d => {
    const pasaPaletero = filtroPaletero === 'TODOS' || d.paletero_nomina === filtroPaletero;
    const pasaPedido = filtroPedido === 'TODOS' || d.pedido === filtroPedido;
    return pasaPaletero && pasaPedido;
  });

  // Lógica de agrupación MEJORADA para detectar múltiples palets
  const cuadrillasAgrupadas = datosFiltrados.reduce((acumulador, actual) => {
    const llave = `Paletero-${actual.paletero_nomina}-Pedido-${actual.pedido}`;
    
    if (!acumulador[llave]) {
      acumulador[llave] = {
        paletero: actual.paletero_nomina,
        pedido: actual.pedido,
        tiposPaletUnicos: new Set(), // Usamos un Set para guardar los palets sin repetirlos
        totalGavetas: 0,
        trabajadores: []
      };
    }
    
    acumulador[llave].tiposPaletUnicos.add(actual.tipo_palet);
    acumulador[llave].totalGavetas += actual.gavetas;
    acumulador[llave].trabajadores.push(actual);
    return acumulador;
  }, {});

  // Convertimos el Set a Array y ordenamos a los trabajadores por nombre
  const listaCuadrillas = Object.values(cuadrillasAgrupadas).map(c => {
    return {
      ...c,
      tiposPaletArray: Array.from(c.tiposPaletUnicos),
      // ORDENAMOS ALFABÉTICAMENTE para que los repetidos salgan juntos
      trabajadores: c.trabajadores.sort((a, b) => a.trabajador_nombre.localeCompare(b.trabajador_nombre))
    };
  });

  const totalGeneralGavetas = datosFiltrados.reduce((acc, curr) => acc + curr.gavetas, 0);

  const datosGrafica = listaCuadrillas.map(c => ({
    nombre: `Pal. ${c.paletero}`,
    Gavetas: c.totalGavetas
  }));

  if (loading) {
    return <div className="min-h-screen bg-[#F4F7F5] flex items-center justify-center font-bold text-[#1C4D2E] text-xl">Cargando Panel de Control Analítico...</div>;
  }

  return (
    <main className="min-h-screen bg-[#E5E9EB] p-6 font-sans flex flex-col gap-6">
      
      <header className="flex justify-between items-end border-b-4 border-[#1C4D2E] pb-4">
        <div>
          <h1 className="text-[#1C4D2E] text-4xl font-black tracking-tighter">PRIMA<span className="text-[#C22821]">FLOR</span></h1>
          <p className="text-gray-500 font-bold uppercase tracking-widest text-sm">Dashboard Analítico de Cosecha</p>
        </div>
        <div className="text-right bg-white p-4 rounded-xl shadow-sm border border-gray-200">
          <p className="text-sm text-gray-500 font-bold uppercase">Producción Filtrada</p>
          <p className="text-4xl font-black text-[#1C4D2E]">{totalGeneralGavetas} <span className="text-lg text-gray-400">Gavetas</span></p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-200 flex flex-col justify-center">
          <h3 className="text-[#1C4D2E] font-black text-xl mb-4 flex items-center gap-2">Control de Filtros</h3>
          
          <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Filtrar por Paletero</label>
          <select value={filtroPaletero} onChange={(e) => setFiltroPaletero(e.target.value)} className="w-full p-3 rounded-xl bg-gray-50 border-2 border-gray-200 mb-4 font-bold text-[#1C4D2E] outline-none">
            {paleterosUnicos.map(p => <option key={p} value={p}>{p}</option>)}
          </select>

          <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Filtrar por Pedido</label>
          <select value={filtroPedido} onChange={(e) => setFiltroPedido(e.target.value)} className="w-full p-3 rounded-xl bg-gray-50 border-2 border-gray-200 font-bold text-[#1C4D2E] outline-none">
            {pedidosUnicos.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-200 lg:col-span-2 h-[300px]">
          <h3 className="text-[#1C4D2E] font-black text-xl mb-4">Rendimiento por Cuadrilla</h3>
          {datosGrafica.length > 0 ? (
            <ResponsiveContainer width="100%" height="85%">
              <BarChart data={datosGrafica} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis dataKey="nombre" tick={{ fill: '#6B7280', fontSize: 12, fontWeight: 'bold' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#6B7280', fontSize: 12, fontWeight: 'bold' }} axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: '#F3F4F6' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                <Bar dataKey="Gavetas" fill="#1C4D2E" radius={[6, 6, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-gray-400 font-bold">No hay datos para graficar.</div>
          )}
        </div>
      </div>

      {listaCuadrillas.length === 0 ? (
        <div className="bg-white p-10 text-center rounded-2xl shadow-sm text-gray-500 font-bold text-xl border border-gray-200">
          No se encontraron cuadrillas con los filtros seleccionados.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {listaCuadrillas.map((cuadrilla, index) => (
            <div key={index} className="bg-white rounded-3xl shadow-md overflow-hidden border border-gray-200">
              
              <div className="bg-[#1C4D2E] p-4 text-white flex justify-between items-center">
                <div>
                  <p className="text-[10px] text-green-300 font-bold uppercase tracking-wider">Paletero / Nómina</p>
                  <p className="font-black text-2xl">{cuadrilla.paletero}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-green-300 font-bold uppercase tracking-wider">Total Cuadrilla</p>
                  <p className="font-black text-3xl">{cuadrilla.totalGavetas}</p>
                </div>
              </div>

              <div className="bg-[#153a22] px-4 py-2 text-white flex justify-between text-xs font-bold items-center">
                <span>Pedido: {cuadrilla.pedido}</span>
                {/* Lógica de Cabecera: Si hay más de 1 tipo, dice Múltiples. Si es 1, muestra el nombre. */}
                <span className="truncate ml-2 opacity-80 text-right">
                  {cuadrilla.tiposPaletArray.length > 1 ? 'Múltiples Configuraciones' : cuadrilla.tiposPaletArray[0]}
                </span>
              </div>

              <div className="p-4">
                <h4 className="text-xs font-bold text-gray-400 uppercase mb-3 border-b pb-2">Desglose de Trabajadores</h4>
                <div className="flex flex-col gap-3">
                  {cuadrilla.trabajadores.map(t => {
                    // Si las gavetas son 0, no mostramos la fila para no ensuciar el dashboard
                    if(t.gavetas === 0) return null;

                    return (
                      <div key={t._id} className="flex justify-between items-start bg-gray-50 p-3 rounded-xl border border-gray-200">
                        <div className="w-[70%]">
                          <p className="font-bold text-[#1C4D2E] text-lg leading-tight">{t.trabajador_nombre}</p>
                          <p className="text-[10px] text-gray-500 font-bold mb-1">Nóm: {t.trabajador_nomina} | Tkt: {t.trabajador_ticket}</p>
                          
                          {/* ETIQUETA VISUAL DEL TIPO DE PALET */}
                          <p className="text-[9px] text-white bg-[#1C4D2E] inline-block px-2 py-0.5 rounded-md truncate max-w-full font-bold">
                            {t.tipo_palet}
                          </p>
                        </div>
                        <div className="text-right w-[30%]">
                          <p className="font-black text-2xl text-[#1C4D2E]">{t.gavetas}</p>
                          <p className="text-[9px] text-gray-400 font-bold uppercase">{t.palets} Palets</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}