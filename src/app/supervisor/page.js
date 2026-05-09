"use client";
import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell, Legend } from 'recharts';

const COLORES_PIE = ['#1C4D2E', '#C22821', '#F59E0B', '#3B82F6', '#8B5CF6', '#10B981', '#F43F5E', '#14B8A6'];

// Importamos el catálogo para poder "traducir" el palet al nombre del cliente
const CATALOGO_CONFIGURACIONES = [
  { id: '1', cliente: "Bakkavor", palet: "CHEP 1x1.2 (Caja EPS 24603)", cajas: 50 },
  { id: '2', cliente: "Coop Norge", palet: "EURO CHEP 0.8x1.2 (EPS 15604)", cajas: 56 },
  { id: '3', cliente: "Coop Norge", palet: "EURO CHEP 0.8x1.2 (EPS 21604)", cajas: 44 },
  { id: '4', cliente: "Ametller", palet: "EURO OFICIAL 120x80 (EPS 156)", cajas: 52 },
  { id: '5', cliente: "Fruktservice", palet: "EURO OFICIAL (Cartón)", cajas: 40 },
  { id: '6', cliente: "SIA RIMI", palet: "EURO 5T SUELO (IFCO 6413)", cajas: 60 },
  { id: '7', cliente: "SIA RIMI", palet: "EURO 5T SUELO (IFCO 6415)", cajas: 60 },
  { id: '8', cliente: "Primaflor", palet: "CHEP 1x1.2 (Azul Primaflor)", cajas: 40 },
  { id: '9', cliente: "Mimaflor", palet: "EURO CHEP 0.8x1.2 (CPR F6418)", cajas: 52 },
  { id: '10', cliente: "RBC Pulpi", palet: "CHEP 1x1.2 (Plástico Blanco)", cajas: 30 }
];

// Función ayudante para obtener el cliente
const getClientePorPalet = (nombrePalet) => {
  const config = CATALOGO_CONFIGURACIONES.find(c => c.palet === nombrePalet);
  return config ? config.cliente : nombrePalet; // Si es un dato viejo de prueba, muestra el raw
};

export default function SupervisorDashboard() {
  const [datos, setDatos] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // ESTADOS DE LOS FILTROS
  const [filtroFechaInicio, setFiltroFechaInicio] = useState('');
  const [filtroFechaFin, setFiltroFechaFin] = useState('');
  const [filtroPaletero, setFiltroPaletero] = useState('TODOS');
  const [filtroPedido, setFiltroPedido] = useState('TODOS');
  const [filtroCliente, setFiltroCliente] = useState('TODOS');

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

  // Listas únicas para los selectores (Ahora traduce a Clientes Reales)
  const paleterosUnicos = ['TODOS', ...new Set(datos.map(d => d.paletero_nomina))];
  const pedidosUnicos = ['TODOS', ...new Set(datos.map(d => d.pedido))];
  const clientesUnicos = ['TODOS', ...new Set(datos.map(d => getClientePorPalet(d.tipo_palet)))];

  // ==========================================
  // MOTOR DE FILTROS
  // ==========================================
  const datosFiltrados = datos.filter(d => {
    const pasaPaletero = filtroPaletero === 'TODOS' || d.paletero_nomina === filtroPaletero;
    const pasaPedido = filtroPedido === 'TODOS' || d.pedido === filtroPedido;
    
    // Evaluamos contra el nombre real del cliente
    const nombreClienteReal = getClientePorPalet(d.tipo_palet);
    const pasaCliente = filtroCliente === 'TODOS' || nombreClienteReal === filtroCliente;

    // Filtro de Fechas
    const fechaDoc = d.createdAt ? new Date(d.createdAt) : new Date(parseInt(d._id.substring(0, 8), 16) * 1000);
    fechaDoc.setHours(0,0,0,0);

    let pasaFechaInicio = true;
    let pasaFechaFin = true;

    if (filtroFechaInicio) {
      const fInicio = new Date(filtroFechaInicio + 'T00:00:00');
      fInicio.setHours(0,0,0,0);
      pasaFechaInicio = fechaDoc >= fInicio;
    }
    if (filtroFechaFin) {
      const fFin = new Date(filtroFechaFin + 'T00:00:00');
      fFin.setHours(0,0,0,0);
      pasaFechaFin = fechaDoc <= fFin;
    }

    return pasaPaletero && pasaPedido && pasaCliente && pasaFechaInicio && pasaFechaFin;
  });

  const limpiarFiltros = () => {
    setFiltroFechaInicio(''); setFiltroFechaFin('');
    setFiltroPaletero('TODOS'); setFiltroPedido('TODOS'); setFiltroCliente('TODOS');
  };

  // ==========================================
  // CÁLCULO DE KPIs
  // ==========================================
  const kpiTotalGavetas = datosFiltrados.reduce((acc, curr) => acc + curr.gavetas, 0);
  const kpiTotalPalets = datosFiltrados.reduce((acc, curr) => acc + (curr.palets || 0), 0);
  const kpiTrabajadoresUnicos = new Set(datosFiltrados.map(d => d.trabajador_nomina)).size;
  const kpiPromedioGavetas = kpiTrabajadoresUnicos > 0 ? Math.round(kpiTotalGavetas / kpiTrabajadoresUnicos) : 0;

  // ==========================================
  // PREPARACIÓN DE DATOS PARA GRÁFICAS
  // ==========================================
  
  const cuadrillasAgrupadas = datosFiltrados.reduce((acumulador, actual) => {
    const llaveGroup = `Paletero-${actual.paletero_nomina}-Pedido-${actual.pedido}`;
    if (!acumulador[llaveGroup]) {
      acumulador[llaveGroup] = {
        paletero: actual.paletero_nomina, pedido: actual.pedido, tiposPaletUnicos: new Set(),
        totalGavetas: 0, trabajadoresMap: {} 
      };
    }
    const groupRef = acumulador[llaveGroup];
    groupRef.tiposPaletUnicos.add(actual.tipo_palet);
    groupRef.totalGavetas += actual.gavetas;

    if (!groupRef.trabajadoresMap[actual.trabajador_nomina]) {
      groupRef.trabajadoresMap[actual.trabajador_nomina] = {
        nombre: actual.trabajador_nombre, nomina: actual.trabajador_nomina, ticket: actual.trabajador_ticket,
        produccion: [] 
      };
    }
    groupRef.trabajadoresMap[actual.trabajador_nomina].produccion.push({
      id: actual._id, tipo_palet: actual.tipo_palet, gavetas: actual.gavetas, palets: actual.palets
    });
    return acumulador;
  }, {});

  const listaCuadrillas = Object.values(cuadrillasAgrupadas).map(c => ({
    ...c,
    tiposPaletArray: Array.from(c.tiposPaletUnicos),
    trabajadoresDetallados: Object.values(c.trabajadoresMap).sort((a, b) => a.nombre.localeCompare(b.nombre))
  }));

  const datosGraficaBarras = listaCuadrillas.map(c => ({
    nombre: `Pal: ${c.paletero}`, Gavetas: c.totalGavetas
  }));

  // DATOS PARA GRÁFICA DE PASTEL (AGRUPADOS POR CLIENTE REAL)
  const gavetasPorClienteMap = datosFiltrados.reduce((acc, curr) => {
    const nombreCliente = getClientePorPalet(curr.tipo_palet);
    acc[nombreCliente] = (acc[nombreCliente] || 0) + curr.gavetas;
    return acc;
  }, {});
  
  const datosPie = Object.keys(gavetasPorClienteMap).map(key => ({
    name: key, value: gavetasPorClienteMap[key]
  }));

  if (loading) return <div className="min-h-screen bg-[#F4F7F5] flex items-center justify-center font-bold text-[#1C4D2E] text-xl animate-pulse">Cargando Centro de Control...</div>;

  return (
    <main className="min-h-screen bg-[#E5E9EB] p-4 md:p-6 font-sans flex flex-col gap-6 pb-24">
      
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end border-b-4 border-[#1C4D2E] pb-4 gap-4">
        <div>
          <h1 className="text-[#1C4D2E] text-3xl md:text-5xl font-black tracking-tighter">PRIMA<span className="text-[#C22821]">FLOR</span></h1>
          <p className="text-gray-500 font-bold uppercase tracking-widest text-xs md:text-sm mt-1">Dashboard Gerencial</p>
        </div>
      </header>

      {/* FILA 1: KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <div className="bg-white p-4 md:p-6 rounded-3xl shadow-sm border border-gray-200 border-l-8 border-l-[#1C4D2E]">
          <p className="text-[10px] md:text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">Volumen Total</p>
          <p className="text-3xl md:text-5xl font-black text-[#1C4D2E]">{kpiTotalGavetas} <span className="text-sm text-gray-400 font-bold uppercase">Gav</span></p>
        </div>
        <div className="bg-white p-4 md:p-6 rounded-3xl shadow-sm border border-gray-200 border-l-8 border-l-[#C22821]">
          <p className="text-[10px] md:text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">Palets Completados</p>
          <p className="text-3xl md:text-5xl font-black text-[#1C4D2E]">{kpiTotalPalets} <span className="text-sm text-gray-400 font-bold uppercase">Pal</span></p>
        </div>
        <div className="bg-white p-4 md:p-6 rounded-3xl shadow-sm border border-gray-200 border-l-8 border-l-blue-600">
          <p className="text-[10px] md:text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">Fuerza Laboral</p>
          <p className="text-3xl md:text-5xl font-black text-[#1C4D2E]">{kpiTrabajadoresUnicos} <span className="text-sm text-gray-400 font-bold uppercase">Trab</span></p>
        </div>
        <div className="bg-white p-4 md:p-6 rounded-3xl shadow-sm border border-gray-200 border-l-8 border-l-amber-500">
          <p className="text-[10px] md:text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">Productividad Promedio</p>
          <p className="text-3xl md:text-5xl font-black text-[#1C4D2E]">{kpiPromedioGavetas} <span className="text-sm text-gray-400 font-bold uppercase">Gav/Trab</span></p>
        </div>
      </div>

      {/* FILA 2: PANTALLA DE FILTROS */}
      <div className="bg-white p-4 md:p-6 rounded-3xl shadow-sm border border-gray-200">
        <div className="flex justify-between items-center mb-4 border-b pb-2">
          <h3 className="text-[#1C4D2E] font-black text-lg md:text-xl">Panel de Filtros</h3>
          <button onClick={limpiarFiltros} className="text-xs font-bold text-[#C22821] bg-red-50 px-3 py-1.5 rounded-lg hover:bg-red-100 transition-colors border border-red-100 shadow-sm">
            Limpiar Filtros
          </button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Desde (Fecha)</label>
            <input type="date" value={filtroFechaInicio} onChange={(e) => setFiltroFechaInicio(e.target.value)} className="w-full p-2.5 md:p-3 rounded-xl bg-gray-50 border-2 border-gray-200 font-bold text-[#1C4D2E] outline-none text-xs md:text-sm" />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Hasta (Fecha)</label>
            <input type="date" value={filtroFechaFin} onChange={(e) => setFiltroFechaFin(e.target.value)} className="w-full p-2.5 md:p-3 rounded-xl bg-gray-50 border-2 border-gray-200 font-bold text-[#1C4D2E] outline-none text-xs md:text-sm" />
          </div>
          <div className="col-span-2 lg:col-span-1">
            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Por Paletero</label>
            <select value={filtroPaletero} onChange={(e) => setFiltroPaletero(e.target.value)} className="w-full p-2.5 md:p-3 rounded-xl bg-gray-50 border-2 border-gray-200 font-bold text-[#1C4D2E] outline-none text-xs md:text-sm">
              {paleterosUnicos.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div className="col-span-1">
            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Por Pedido</label>
            <select value={filtroPedido} onChange={(e) => setFiltroPedido(e.target.value)} className="w-full p-2.5 md:p-3 rounded-xl bg-gray-50 border-2 border-gray-200 font-bold text-[#1C4D2E] outline-none text-xs md:text-sm">
              {pedidosUnicos.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div className="col-span-1">
            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Por Cliente</label>
            <select value={filtroCliente} onChange={(e) => setFiltroCliente(e.target.value)} className="w-full p-2.5 md:p-3 rounded-xl bg-gray-50 border-2 border-[#1C4D2E] font-bold text-[#1C4D2E] outline-none shadow-sm text-xs md:text-sm">
              {clientesUnicos.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* FILA 3: SECCIÓN DE GRÁFICAS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-4 md:p-6 rounded-3xl shadow-sm border border-gray-200 h-[350px] md:h-[400px] w-full min-w-0 flex flex-col">
          <h3 className="text-[#1C4D2E] font-black text-lg md:text-xl mb-4">Rendimiento por Cuadrilla</h3>
          {datosGraficaBarras.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={datosGraficaBarras} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis dataKey="nombre" tick={{ fill: '#6B7280', fontSize: 10, fontWeight: 'bold' }} axisLine={false} tickLine={false} angle={-45} textAnchor="end" />
                <YAxis tick={{ fill: '#6B7280', fontSize: 10, fontWeight: 'bold' }} axisLine={false} tickLine={false} />
                <RechartsTooltip cursor={{ fill: '#F3F4F6' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                <Bar dataKey="Gavetas" fill="#1C4D2E" radius={[6, 6, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-400 font-bold text-sm">No hay datos para graficar.</div>
          )}
        </div>

        <div className="bg-white p-4 md:p-6 rounded-3xl shadow-sm border border-gray-200 h-[350px] md:h-[400px] w-full min-w-0 flex flex-col">
          <h3 className="text-[#1C4D2E] font-black text-lg md:text-xl mb-2">Distribución por Cliente</h3>
          <p className="text-xs text-gray-400 font-bold mb-4">Porcentaje de volumen de producción</p>
          {datosPie.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={datosPie} cx="50%" cy="45%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value" stroke="none" >
                  {datosPie.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORES_PIE[index % COLORES_PIE.length]} />
                  ))}
                </Pie>
                <RechartsTooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontWeight: 'bold' }} />
                <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: 'bold', color: '#4B5563' }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-400 font-bold text-sm">No hay datos para graficar.</div>
          )}
        </div>
      </div>

      {/* FILA 4: LISTADO DETALLADO */}
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
                  <p className="text-[9px] md:text-[10px] text-green-300 font-bold uppercase tracking-wider">Total Filtrado</p>
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
                  {cuadrilla.trabajadoresDetallados.map(worker => (
                    <div key={worker.nomina} className="bg-gray-50 p-3 rounded-2xl border border-gray-200">
                      <div className="border-b pb-2 mb-2 flex justify-between items-start">
                        <div>
                          <p className="font-bold text-[#1C4D2E] text-base md:text-lg leading-tight">{worker.nombre}</p>
                          <p className="text-[9px] md:text-[10px] text-gray-500 font-bold">Nóm: {worker.nomina} | Tkt: {worker.ticket}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-black text-xl text-[#1C4D2E]">
                            {worker.produccion.reduce((sum, p) => sum + p.gavetas, 0)}
                          </p>
                          <p className="text-[9px] text-gray-400 font-bold uppercase">Gavetas Totales</p>
                        </div>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        {worker.produccion.map(p => (
                          <div key={p.id} className="flex justify-between items-center bg-white p-2 rounded-xl border border-gray-100 text-[11px] text-[#1C4D2E] font-bold hover:bg-green-50 transition-colors">
                            <span className="truncate w-[60%]">{p.tipo_palet}</span>
                            <span className="w-[40%] text-right bg-green-100/80 px-2 py-1.5 rounded-lg">
                              {p.palets} Pal / {p.gavetas} Gav
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