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
      if (json.success) setDatos(json.data);
    } catch (error) { console.error("Error cargando dashboard:", error); }
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

  // LÓGICA DE AGRUPACIÓN PROFUNDA (Restaurando info detallada)
  const cuadrillasAgrupadas = datosFiltrados.reduce((acumulador, actual) => {
    const llaveGroup = `Paletero-${actual.paletero_nomina}-Pedido-${actual.pedido}`;
    
    if (!acumulador[llaveGroup]) {
      acumulador[llaveGroup] = {
        paletero: actual.paletero_nomina,
        pedido: actual.pedido,
        tiposPaletUnicos: new Set(),
        totalGavetas: 0,
        // Diccionario profundo para unificar trabajadores
        trabajadoresMap: {} 
      };
    }
    
    const groupRef = acumulador[llaveGroup];
    groupRef.tiposPaletUnicos.add(actual.tipo_palet);
    groupRef.totalGavetas += actual.gavetas;

    // Unificar producción por trabajador
    if (!groupRef.trabajadoresMap[actual.trabajador_nomina]) {
      groupRef.trabajadoresMap[actual.trabajador_nomina] = {
        nombre: actual.trabajador_nombre,
        nomina: actual.trabajador_nomina,
        ticket: actual.trabajador_ticket,
        produccion: [] // Aquí guardamos el desglose de cada tipo
      };
    }

    // Añadir el desglose de este registro específico a la producción del trabajador
    groupRef.trabajadoresMap[actual.trabajador_nomina].produccion.push({
      id: actual._id,
      tipo_palet: actual.tipo_palet,
      gavetas: actual.gavetas,
      palets: actual.palets
    });

    return acumulador;
  }, {});

  // Convertir la estructura profunda a arreglo ordenado alfabéticamente
  const listaCuadrillas = Object.values(cuadrillasAgrupadas).map(c => ({
    ...c,
    tiposPaletArray: Array.from(c.tiposPaletUnicos),
    // Ordenar trabajadores por nombre alfabéticamente
    trabajadoresDetallados: Object.values(c.trabajadoresMap).sort((a, b) => a.nombre.localeCompare(b.nombre))
  }));

  const totalGeneralGavetas = datosFiltrados.reduce((acc, curr) => acc + curr.gavetas, 0);

  const datosGrafica = listaCuadrillas.map(c => ({
    nombre: `Pal: ${c.paletero}`, Gavetas: c.totalGavetas
  }));

  if (loading) return <div className="min-h-screen bg-[#F4F7F5] flex items-center justify-center font-bold text-[#1C4D2E] text-xl">Cargando Panel...</div>;

  return (
    <main className="min-h-screen bg-[#E5E9EB] p-4 md:p-6 font-sans flex flex-col gap-6">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end border-b-4 border-[#1C4D2E] pb-4 gap-4">
        <div>
          <h1 className="text-[#1C4D2E] text-3xl md:text-4xl font-black tracking-tighter">PRIMA<span className="text-[#C22821]">FLOR</span></h1>
          <p className="text-gray-500 font-bold uppercase tracking-widest text-xs md:text-sm">Dashboard Analítico</p>
        </div>
        <div className="w-full md:w-auto text-right bg-white p-4 rounded-xl shadow-sm border border-gray-200">
          <p className="text-xs text-gray-500 font-bold uppercase">Producción Filtrada</p>
          <p className="text-3xl md:text-4xl font-black text-[#1C4D2E]">{totalGeneralGavetas} <span className="text-sm md:text-lg text-gray-400">Gavetas</span></p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white p-4 md:p-6 rounded-3xl shadow-sm border border-gray-200 flex flex-col justify-center relative">
          <h3 className="text-[#1C4D2E] font-black text-lg md:text-xl mb-4">Control de Filtros</h3>
          <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Filtrar por Paletero</label>
          <select value={filtroPaletero} onChange={(e) => setFiltroPaletero(e.target.value)} className="w-full p-3 rounded-xl bg-gray-50 border-2 border-gray-200 mb-4 font-bold text-[#1C4D2E] outline-none">
            {paleterosUnicos.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Filtrar por Pedido</label>
          <select value={filtroPedido} onChange={(e) => setFiltroPedido(e.target.value)} className="w-full p-3 rounded-xl bg-gray-50 border-2 border-gray-200 font-bold text-[#1C4D2E] outline-none">
            {pedidosUnicos.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>

        <div className="bg-white p-4 md:p-6 rounded-3xl shadow-sm border border-gray-200 lg:col-span-2 h-[300px] md:h-[350px] w-full min-w-0">
          <h3 className="text-[#1C4D2E] font-black text-lg md:text-xl mb-4">Rendimiento por Cuadrilla</h3>
          {datosGrafica.length > 0 ? (
            <ResponsiveContainer width="100%" height="85%">
              <BarChart data={datosGrafica} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis dataKey="nombre" tick={{ fill: '#6B7280', fontSize: 10, fontWeight: 'bold' }} axisLine={false} tickLine={false} angle={-45} textAnchor="end" />
                <YAxis tick={{ fill: '#6B7280', fontSize: 10, fontWeight: 'bold' }} axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: '#F3F4F6' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                <Bar dataKey="Gavetas" fill="#1C4D2E" radius={[6, 6, 0, 0]} barSize={30} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-gray-400 font-bold text-sm">No hay datos para graficar.</div>
          )}
        </div>
      </div>

      {listaCuadrillas.length === 0 ? (
        <div className="bg-white p-10 text-center rounded-2xl shadow-sm text-gray-500 font-bold text-base md:text-xl border border-gray-200 relative">
          No se encontraron cuadrillas con los filtros seleccionados.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 relative">
          {listaCuadrillas.map((cuadrilla, index) => (
            <div key={index} className="bg-white rounded-3xl shadow-md overflow-hidden border border-gray-200 hover:shadow-lg transition-shadow relative">
              <div className="bg-[#1C4D2E] p-4 text-white flex justify-between items-center relative z-10">
                <div>
                  <p className="text-[9px] md:text-[10px] text-green-300 font-bold uppercase tracking-wider">Paletero / Nómina</p>
                  <p className="font-black text-xl md:text-2xl">{cuadrilla.paletero}</p>
                </div>
                <div className="text-right">
                  <p className="text-[9px] md:text-[10px] text-green-300 font-bold uppercase tracking-wider">Total Cuadrilla</p>
                  <p className="font-black text-2xl md:text-3xl">{cuadrilla.totalGavetas}</p>
                </div>
              </div>
              <div className="bg-[#153a22] px-4 py-2 text-white flex justify-between text-[10px] md:text-xs font-bold items-center relative z-10">
                <span>Pedido: {cuadrilla.pedido}</span>
                <span className="truncate ml-2 opacity-80 text-right">
                  {cuadrilla.tiposPaletArray.length > 1 ? 'Múltiples Config.' : cuadrilla.tiposPaletArray[0]}
                </span>
              </div>
              
              <div className="p-4 relative z-10">
                <h4 className="text-[10px] md:text-xs font-bold text-gray-400 uppercase mb-3 border-b pb-2">Desglose de Trabajadores (Alfabético)</h4>
                <div className="flex flex-col gap-3">
                  
                  {/* LOOP SOBRE TRABAJADORES UNIFICADOS */}
                  {cuadrilla.trabajadoresDetallados.map(worker => (
                    <div key={worker.nomina} className="bg-gray-50 p-3 rounded-2xl border border-gray-200">
                      
                      {/* Cabecera info trabajador */}
                      <div className="border-b pb-2 mb-2 flex justify-between items-start">
                        <div>
                          <p className="font-bold text-[#1C4D2E] text-base md:text-lg leading-tight">{worker.nombre}</p>
                          <p className="text-[9px] md:text-[10px] text-gray-500 font-bold">Nóm: {worker.nomina} | Tkt: {worker.ticket}</p>
                        </div>
                        {/* Suma total gavetas del trabajador en este turno */}
                        <div className="text-right">
                          <p className="font-black text-xl text-[#1C4D2E]">
                            {worker.produccion.reduce((sum, p) => sum + p.gavetas, 0)}
                          </p>
                          <p className="text-[9px] text-gray-400 font-bold uppercase">Gavetas Totales</p>
                        </div>
                      </div>

                      {/* TABLA DETALLADA DE DESGLOSE (Como exigiste en Imagen 2) */}
                      <div className="flex flex-col gap-1.5">
                        {worker.produccion.map(p => (
                          <div key={p.id} className="flex justify-between items-center bg-white p-2 rounded-xl border border-gray-100 text-[11px] text-[#1C4D2E] font-bold hover:bg-green-50 transition-colors">
                            <span className="truncate w-[60%]">{p.tipo_palet}</span>
                            <span className="w-[40%] text-right bg-green-100/80 px-2 py-1.5 rounded-lg">
                              {p.palets} Palets / {p.gavetas} Gavetas
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}