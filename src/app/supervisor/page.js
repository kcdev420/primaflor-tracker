"use client";
import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell, Legend } from 'recharts';

const COLORES_PIE = ['#1C4D2E', '#C22821', '#F59E0B', '#3B82F6', '#8B5CF6', '#10B981', '#F43F5E', '#14B8A6'];

const CATALOGO_CONFIGURACIONES = [
  { id: '1', cliente: "Bakkavor", palet_db: "CHEP 1x1.2 (Caja EPS 24603)", palet: "CHEP 1x1.2", caja: "EPS 24603", cajas: 50 },
  { id: '2', cliente: "Coop Norge", palet_db: "EURO CHEP 0.8x1.2 (EPS 15604)", palet: "EURO CHEP 0.8x1.2", caja: "EPS 15604", cajas: 56 },
  { id: '3', cliente: "Coop Norge", palet_db: "EURO CHEP 0.8x1.2 (EPS 21604)", palet: "EURO CHEP 0.8x1.2", caja: "EPS 21604", cajas: 44 },
  { id: '4', cliente: "Ametller", palet_db: "EURO OFICIAL 120x80 (EPS 156)", palet: "EURO OFICIAL 120x80", caja: "EPS 156", cajas: 52 },
  { id: '5', cliente: "Fruktservice", palet_db: "EURO OFICIAL (Cartón)", palet: "EURO OFICIAL", caja: "Cartón", cajas: 40 },
  { id: '6', cliente: "SIA RIMI", palet_db: "EURO 5T SUELO (IFCO 6413)", palet: "EURO 5T SUELO", caja: "IFCO 6413", cajas: 60 },
  { id: '7', cliente: "SIA RIMI", palet_db: "EURO 5T SUELO (IFCO 6415)", palet: "EURO 5T SUELO", caja: "IFCO 6415", cajas: 60 },
  { id: '8', cliente: "Primaflor", palet_db: "CHEP 1x1.2 (Azul Primaflor)", palet: "CHEP 1x1.2", caja: "Azul Primaflor", cajas: 40 },
  { id: '9', planned: false, cliente: "Mimaflor", palet_db: "EURO CHEP 0.8x1.2 (CPR F6418)", palet: "EURO CHEP 0.8x1.2", caja: "CPR F6418", cajas: 52 },
  { id: '10', cliente: "RBC Pulpi", palet_db: "CHEP 1x1.2 (Plástico Blanco)", palet: "CHEP 1x1.2", caja: "Plástico Blanco", cajas: 30 }
];

const getClientePorPalet = (nombrePaletRaw) => {
  const config = CATALOGO_CONFIGURACIONES.find(c => c.palet_db === nombrePaletRaw);
  return config ? config.cliente : 'Otros (Histórico)'; 
};

export default function SupervisorDashboard() {
  const [datos, setDatos] = useState([]);
  const [alertas, setAlertas] = useState([]);
  const [metasPedidos, setMetasPedidos] = useState({}); 
  const [loading, setLoading] = useState(true);
  
  const [filtroFechaInicio, setFiltroFechaInicio] = useState('');
  const [filtroFechaFin, setFiltroFechaFin] = useState('');
  const [filtroPaletero, setFiltroPaletero] = useState('TODOS');
  const [filtroPedido, setFiltroPedido] = useState('TODOS');
  const [filtroCliente, setFiltroCliente] = useState('TODOS');

  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [credenciales, setCredenciales] = useState({ usuario: '', pass: '', nomina: '' });
  
  const [nuevoPedido, setNuevoPedido] = useState({ pedido: '', fecha_programada: '', hora_inicio: '', metas: {} });

  const fetchDatos = async () => {
    try {
      const res = await fetch('/api/tracker');
      const json = await res.json();
      if (json.success) {
        setDatos(json.data);
        const uniquePedidos = [...new Set(json.data.map(d => d.pedido))];
        const metasFetchadas = { ...metasPedidos };
        
        for (const ped of uniquePedidos) {
          if (!metasFetchadas[ped]) {
            try {
              const resMeta = await fetch(`/api/pedidos?pedido=${ped}`);
              const metaJson = await resMeta.json();
              if (metaJson.success && metaJson.data) {
                metasFetchadas[ped] = {
                  metas: metaJson.data.metas || {},
                  fecha_programada: metaJson.data.fecha_programada || '',
                  hora_inicio: metaJson.data.hora_inicio || ''
                };
              }
            } catch (e) {}
          }
        }
        setMetasPedidos(metasFetchadas);
      }
      const resAlertas = await fetch('/api/pedidos?tipo=alertas');
      const jsonAlertas = await resAlertas.json();
      if (jsonAlertas.success) setAlertas(jsonAlertas.data);
    } catch (error) { console.error("Error cargando dashboard:", error); }
    setLoading(false);
  };

  useEffect(() => {
    fetchDatos();
    const interval = setInterval(fetchDatos, 5000); 
    return () => clearInterval(interval);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const resolverAlerta = async (id) => {
    await fetch('/api/pedidos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tipo: 'resolver_alerta', id }) });
    fetchDatos();
  };

  const handleLogin = (e) => {
    e.preventDefault();
    if (credenciales.usuario === 'admin' && credenciales.pass === 'admin' && credenciales.nomina) {
      setShowLoginModal(false); setShowConfigModal(true);
    } else { alert("Credenciales incorrectas"); }
  };

  const handleMetasChange = (idPalet, cantidad) => {
    setNuevoPedido(prev => ({ ...prev, metas: { ...prev.metas, [idPalet]: Number(cantidad) } }));
  };

  const guardarConfiguracionPedido = async (e) => {
    e.preventDefault();
    if (!nuevoPedido.pedido || !nuevoPedido.fecha_programada || !nuevoPedido.hora_inicio || Object.keys(nuevoPedido.metas).length === 0) {
      return alert("Por favor, llena el número de pedido, la fecha, la hora y al menos una meta.");
    }
    
    await fetch('/api/pedidos', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        tipo: 'crear_pedido', 
        data: { 
          pedido: nuevoPedido.pedido, 
          fecha_programada: nuevoPedido.fecha_programada,
          hora_inicio: nuevoPedido.hora_inicio,
          metas: nuevoPedido.metas, 
          supervisor_nomina: credenciales.nomina 
        } 
      })
    });
    alert("¡Pedido configurado y enviado a las cuadrillas!");
    setShowConfigModal(false); 
    setNuevoPedido({ pedido: '', fecha_programada: '', hora_inicio: '', metas: {} }); 
    setCredenciales({ usuario: '', pass: '', nomina: '' });
    fetchDatos(); 
  };

  const paleterosUnicos = ['TODOS', ...new Set(datos.map(d => d.paletero_nomina))];
  const pedidosUnicos = ['TODOS', ...new Set(datos.map(d => d.pedido))];
  const clientesUnicos = ['TODOS', ...new Set(datos.map(d => getClientePorPalet(d.tipo_palet)))];

  const datosFiltrados = datos.filter(d => {
    const pasaPaletero = filtroPaletero === 'TODOS' || d.paletero_nomina === filtroPaletero;
    const pasaPedido = filtroPedido === 'TODOS' || d.pedido === filtroPedido;
    const pasaCliente = filtroCliente === 'TODOS' || getClientePorPalet(d.tipo_palet) === filtroCliente;
    const fechaDoc = d.createdAt ? new Date(d.createdAt) : new Date(parseInt(d._id.substring(0, 8), 16) * 1000);
    fechaDoc.setHours(0,0,0,0);
    let pasaFechaInicio = true, pasaFechaFin = true;
    if (filtroFechaInicio) { const fInicio = new Date(filtroFechaInicio + 'T00:00:00'); fInicio.setHours(0,0,0,0); pasaFechaInicio = fechaDoc >= fInicio; }
    if (filtroFechaFin) { const fFin = new Date(filtroFechaFin + 'T00:00:00'); fFin.setHours(0,0,0,0); pasaFechaFin = fechaDoc <= fFin; }
    return pasaPaletero && pasaPedido && pasaCliente && pasaFechaInicio && pasaFechaFin;
  });

  const limpiarFiltros = () => { setFiltroFechaInicio(''); setFiltroFechaFin(''); setFiltroPaletero('TODOS'); setFiltroPedido('TODOS'); setFiltroCliente('TODOS'); };

  const kpiTotalGavetas = datosFiltrados.reduce((acc, curr) => acc + curr.gavetas, 0);

  const kpiTotalPalets = CATALOGO_CONFIGURACIONES.reduce((total, conf) => {
    // Sumamos todas las gavetas de todos los trabajadores para este tipo de palet
    const gavetasTipo = datosFiltrados
      .filter(d => d.tipo_palet === conf.palet_db || d.tipo_palet === conf.palet)
      .reduce((sum, d) => sum + d.gavetas, 0);
    // Calculamos los palets en equipo y los sumamos al total general
    return total + Math.floor(gavetasTipo / conf.cajas);
  }, 0);
  
  const kpiTrabajadoresUnicos = new Set(datosFiltrados.map(d => d.trabajador_nomina)).size;
  const kpiPromedioGavetas = kpiTrabajadoresUnicos > 0 ? Math.round(kpiTotalGavetas / kpiTrabajadoresUnicos) : 0;

  const cuadrillasAgrupadas = datosFiltrados.reduce((acumulador, actual) => {
    const llaveGroup = `Paletero-${actual.paletero_nomina}-Pedido-${actual.pedido}`;
    if (!acumulador[llaveGroup]) {
      acumulador[llaveGroup] = { 
        paletero_nomina: actual.paletero_nomina, 
        paletero_nombre: actual.paletero_nombre || actual.paletero?.nombre || `Nómina ${actual.paletero_nomina}`, 
        pedido: actual.pedido, 
        tiposPaletUnicos: new Set(), 
        totalGavetas: 0, 
        trabajadoresMap: {} 
      };
    }
    const groupRef = acumulador[llaveGroup];
    groupRef.tiposPaletUnicos.add(actual.tipo_palet); groupRef.totalGavetas += actual.gavetas;
    if (!groupRef.trabajadoresMap[actual.trabajador_nomina]) groupRef.trabajadoresMap[actual.trabajador_nomina] = { nombre: actual.trabajador_nombre, nomina: actual.trabajador_nomina, ticket: actual.trabajador_ticket, produccion: [] };
    groupRef.trabajadoresMap[actual.trabajador_nomina].produccion.push({ id: actual._id, tipo_palet: actual.tipo_palet, gavetas: actual.gavetas, palets: actual.palets });
    return acumulador;
  }, {});

  const listaCuadrillas = Object.values(cuadrillasAgrupadas).map(c => ({
    ...c, tiposPaletArray: Array.from(c.tiposPaletUnicos), trabajadoresDetallados: Object.values(c.trabajadoresMap).sort((a, b) => a.nombre.localeCompare(b.nombre))
  }));

  const datosGraficaBarras = listaCuadrillas.map(c => ({ nombre: c.paletero_nombre, Gavetas: c.totalGavetas }));
  const gavetasPorClienteMap = datosFiltrados.reduce((acc, curr) => { const nc = getClientePorPalet(curr.tipo_palet); acc[nc] = (acc[nc] || 0) + curr.gavetas; return acc; }, {});
  const datosPie = Object.keys(gavetasPorClienteMap).map(key => ({ name: key, value: gavetasPorClienteMap[key] }));

  if (loading) return <div className="min-h-screen bg-[#F4F7F5] flex items-center justify-center font-bold text-[#1C4D2E] text-xl animate-pulse">Cargando Centro de Control...</div>;

  return (
    <main className="min-h-screen bg-[#E5E9EB] p-4 md:p-6 font-sans flex flex-col gap-6 pb-24">
      
      <header className="flex flex-col lg:flex-row justify-between items-start border-b-4 border-[#1C4D2E] pb-4 gap-4 sticky top-0 bg-[#E5E9EB] z-30">
        <div>
          <h1 className="text-[#1C4D2E] text-3xl md:text-5xl font-black tracking-tighter">PRIMA<span className="text-[#C22821]">FLOR</span></h1>
          <p className="text-gray-500 font-bold uppercase tracking-widest text-xs md:text-sm mt-1 leading-tight">Dashboard Gerencial</p>
        </div>
        
        <div className="flex flex-col md:flex-row gap-4 w-full lg:w-auto items-end shrink-0">
          {alertas.length > 0 && (
            <div className="bg-red-50 border-2 border-red-200 p-3 rounded-2xl flex flex-col gap-2 shadow-sm max-h-[150px] overflow-y-auto w-full md:w-[350px] animate-pulse">
              <p className="text-red-600 font-black text-xs uppercase flex items-center gap-1.5 leading-tight">🚨 {alertas.length} Solicitudes de Campo</p>
              {alertas.map(al => (
                <div key={al._id} className="bg-white p-2.5 rounded-xl text-[11px] font-bold border border-red-100 flex justify-between items-center shadow-sm gap-2">
                  <div className="truncate flex-1">
                    <span className="text-[#1C4D2E] text-xs font-black truncate block leading-tight">
                      {al.nombre_paletero ? al.nombre_paletero : `Paletero Nóm: ${al.nomina_paletero}`}
                    </span>
                    <span className="text-gray-400 font-bold text-[9px] uppercase mt-0.5 block">Nóm: {al.nomina_paletero} | Ped: {al.pedido}</span>
                    <span className="font-black text-[#C22821] leading-tight block mt-1">Pide: {al.cantidad} {al.material}</span>
                  </div>
                  <button onClick={() => resolverAlerta(al._id)} className="bg-green-100 text-green-700 px-3 py-2 rounded-lg active:scale-95 transition-transform shadow-sm text-xs shrink-0">Hecho</button>
                </div>
              ))}
            </div>
          )}
          <button onClick={() => setShowLoginModal(true)} className="bg-[#1C4D2E] hover:bg-[#153a22] text-white px-6 py-4 rounded-2xl font-black text-sm uppercase shadow-lg hover:scale-105 transition-transform shrink-0 w-full md:w-auto active:scale-95">
            + Configurar Pedido Meta
          </button>
        </div>
      </header>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 relative z-10">
        <div className="bg-white p-4 md:p-6 rounded-3xl shadow-sm border border-gray-200 border-l-8 border-l-[#1C4D2E]"><p className="text-[10px] md:text-xs text-gray-500 font-bold uppercase mb-1 leading-tight">Volumen Total</p><p className="text-3xl md:text-5xl font-black text-[#1C4D2E] leading-none">{kpiTotalGavetas} <span className="text-sm text-gray-400 font-normal uppercase">Gav</span></p></div>
        <div className="bg-white p-4 md:p-6 rounded-3xl shadow-sm border border-gray-200 border-l-8 border-l-[#C22821]"><p className="text-[10px] md:text-xs text-gray-500 font-bold uppercase mb-1 leading-tight">Palets Completados</p><p className="text-3xl md:text-5xl font-black text-[#1C4D2E] leading-none">{kpiTotalPalets} <span className="text-sm text-gray-400 font-normal uppercase">Pal</span></p></div>
        <div className="bg-white p-4 md:p-6 rounded-3xl shadow-sm border border-gray-200 border-l-8 border-l-blue-600"><p className="text-[10px] md:text-xs text-gray-500 font-bold uppercase mb-1 leading-tight">Fuerza Laboral</p><p className="text-3xl md:text-5xl font-black text-[#1C4D2E] leading-none">{kpiTrabajadoresUnicos} <span className="text-sm text-gray-400 font-normal uppercase">Trab</span></p></div>
        <div className="bg-white p-4 md:p-6 rounded-3xl shadow-sm border border-gray-200 border-l-8 border-l-amber-500"><p className="text-[10px] md:text-xs text-gray-500 font-bold uppercase mb-1 leading-tight">Promedio Gav/Trab</p><p className="text-3xl md:text-5xl font-black text-[#1C4D2E] leading-none">{kpiPromedioGavetas} <span className="text-sm text-gray-400 font-normal uppercase">Gav/T</span></p></div>
      </div>

      <div className="bg-white p-4 md:p-6 rounded-3xl shadow-sm border border-gray-200 relative z-10">
        <div className="flex justify-between items-center mb-4 border-b pb-2"><h3 className="text-[#1C4D2E] font-black text-lg md:text-xl">Panel de Filtros</h3><button onClick={limpiarFiltros} className="text-xs font-bold text-[#C22821] bg-red-50 px-3 py-1.5 rounded-lg border border-red-100 active:scale-95 transition-transform">Limpiar Filtros</button></div>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <div><label className="block text-[10px] font-bold text-gray-400 uppercase mb-1 leading-tight">Desde</label><input type="date" value={filtroFechaInicio} onChange={e => setFiltroFechaInicio(e.target.value)} className="w-full p-3 rounded-xl bg-gray-50 border-2 border-gray-200 outline-none text-xs font-bold text-[#1C4D2E] focus:border-[#1C4D2E]" /></div>
          <div><label className="block text-[10px] font-bold text-gray-400 uppercase mb-1 leading-tight">Hasta</label><input type="date" value={filtroFechaFin} onChange={e => setFiltroFechaFin(e.target.value)} className="w-full p-3 rounded-xl bg-gray-50 border-2 border-gray-200 outline-none text-xs font-bold text-[#1C4D2E] focus:border-[#1C4D2E]" /></div>
          <div><label className="block text-[10px] font-bold text-gray-400 uppercase mb-1 leading-tight">Paletero</label><select value={filtroPaletero} onChange={e => setFiltroPaletero(e.target.value)} className="w-full p-3 rounded-xl bg-gray-50 border-2 border-gray-200 outline-none text-xs font-bold text-[#1C4D2E] focus:border-[#1C4D2E] truncate">{paleterosUnicos.map(p => <option key={p}>{p}</option>)}</select></div>
          <div><label className="block text-[10px] font-bold text-gray-400 uppercase mb-1 leading-tight">Pedido</label><select value={filtroPedido} onChange={e => setFiltroPedido(e.target.value)} className="w-full p-3 rounded-xl bg-gray-50 border-2 border-gray-200 outline-none text-xs font-bold text-[#1C4D2E] focus:border-[#1C4D2E] truncate">{pedidosUnicos.map(p => <option key={p}>{p}</option>)}</select></div>
          <div><label className="block text-[10px] font-bold text-gray-400 uppercase mb-1 leading-tight">Cliente</label><select value={filtroCliente} onChange={e => setFiltroCliente(e.target.value)} className="w-full p-3 rounded-xl bg-gray-50 border-2 border-[#1C4D2E] outline-none text-xs font-bold text-[#1C4D2E] focus:border-[#1C4D2E] truncate">{clientesUnicos.map(p => <option key={p}>{p}</option>)}</select></div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 relative z-10">
        <div className="bg-white p-5 rounded-3xl border shadow-sm h-[380px]"><h3 className="text-[#1C4D2E] font-black text-lg mb-4">Rendimiento por Cuadrilla (Gavetas)</h3>{datosGraficaBarras.length > 0 ? <ResponsiveContainer width="100%" height="100%"><BarChart data={datosGraficaBarras} margin={{ left: -20, bottom: 60, top: 10, right: 10 }}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="nombre" tick={{ fontSize: 9, fill: '#6B7280', fontWeight: 'bold' }} angle={-45} textAnchor="end" interval={0} /><YAxis tick={{ fontSize: 10, fill: '#6B7280', fontWeight: 'bold' }} /><RechartsTooltip contentStyle={{ borderRadius: '12px', border: 'none', shadow: 'lg' }} /><Bar dataKey="Gavetas" fill="#1C4D2E" radius={[6, 6, 0, 0]} barSize={40} /></BarChart></ResponsiveContainer> : <p className="text-gray-400 text-center pt-20">Sin datos</p>}</div>
        
        <div className="bg-white p-5 rounded-3xl border shadow-sm h-[380px]">
          <h3 className="text-[#1C4D2E] font-black text-lg mb-4">Distribución Cliente (% Volumen)</h3>
          {datosPie.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart margin={{ top: 0, right: 0, bottom: 20, left: 0 }}>
                <Pie data={datosPie} cx="50%" cy="40%" innerRadius={45} outerRadius={75} paddingAngle={5} dataKey="value">
                  {datosPie.map((e, i) => <Cell key={i} fill={COLORES_PIE[i % COLORES_PIE.length]} />)}
                </Pie>
                <RechartsTooltip contentStyle={{ borderRadius: '12px', border: 'none', shadow: 'lg', fontWeight: 'bold' }} />
                <Legend verticalAlign="bottom" height={45} iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', color: '#4B5563', paddingTop: '15px' }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-400 text-center pt-20">Sin datos</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 relative z-10">
        {listaCuadrillas.map((c, i) => {
          const metaDelPedidoInfo = metasPedidos[c.pedido];
          const metaDelPedido = metaDelPedidoInfo ? metaDelPedidoInfo.metas : null;
          const fechaPed = metaDelPedidoInfo ? metaDelPedidoInfo.fecha_programada : '';
          const horaPed = metaDelPedidoInfo ? metaDelPedidoInfo.hora_inicio : '';
          
          const datosDelPedidoGlobal = datos.filter(d => d.pedido === c.pedido);
          
          return (
            <div key={i} className="bg-white rounded-3xl shadow-md overflow-hidden border border-gray-200 hover:shadow-lg transition-all flex flex-col relative">
              <div className="bg-[#1C4D2E] p-4 text-white flex justify-between items-center relative z-10">
                <div className="truncate flex-1 pr-2">
                  <p className="text-[10px] text-green-300 font-bold uppercase tracking-wider leading-tight">Paletero en Turno</p>
                  <p className="font-black text-xl md:text-2xl leading-tight truncate">{c.paletero_nombre}</p>
                  {c.paletero_nombre !== c.paletero_nomina && c.paletero_nombre !== `Nómina ${c.paletero_nomina}` && (
                    <p className="text-[10px] text-green-100 font-bold mt-0.5 leading-tight">Nóm: {c.paletero_nomina}</p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[10px] text-green-300 font-bold uppercase tracking-wider leading-tight">Total Filtrado</p>
                  <p className="font-black text-2xl md:text-3xl leading-tight">{c.totalGavetas} <span className="text-sm opacity-70">G</span></p>
                </div>
              </div>
              <div className="bg-[#153a22] px-4 py-2 text-white flex justify-between text-[11px] font-bold items-center relative z-10">
                <span>Pedido: {c.pedido}</span>
                <span className="truncate ml-2 opacity-80 text-right w-1/2">
                  {c.tiposPaletArray.length > 1 ? 'Múltiples Config.' : c.tiposPaletArray[0]}
                </span>
              </div>
              
              <div className="p-4 flex-1 relative z-10">
                <div className="flex flex-col gap-3">
                  {c.trabajadoresDetallados.map(w => (
                    <div key={w.nomina} className="bg-gray-50 p-3 rounded-2xl border border-gray-200">
                      <div className="border-b-2 border-dashed border-gray-200 pb-2 mb-2 flex justify-between items-center gap-2 relative">
                        <div className="truncate flex-1">
                          <p className="font-bold text-[#1C4D2E] text-base md:text-lg leading-tight truncate">{w.nombre}</p>
                          <p className="text-[9px] md:text-[10px] text-gray-500 font-bold uppercase leading-tight mt-1">Nóm: {w.nomina} | Tkt: {w.ticket}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-black text-4xl text-[#1C4D2E] leading-none">
                            {w.produccion.reduce((s, p) => s + p.gavetas, 0)}
                          </p>
                          <p className="text-[10px] text-gray-400 font-bold uppercase leading-tight mt-0.5">Gavetas</p>
                        </div>
                      </div>

                      <div className="flex flex-col gap-1.5">
                        {w.produccion.map(p => (
                          <div key={p.id} className="flex justify-between items-center text-[11px] font-bold text-[#1C4D2E] hover:bg-white p-1.5 rounded-lg transition-colors gap-2">
                            <span className="truncate w-3/5 pr-1 opacity-80">{p.tipo_palet}</span>
                            <span className="bg-green-100/70 text-green-900 px-2 py-1 rounded-md w-2/5 text-right shrink-0 font-black shadow-inner">
                              {p.palets} Pal / {p.gavetas} Gav
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-gray-100 p-4 border-t-2 border-dashed border-gray-200 mt-auto relative z-10">
                <div className="mb-3 text-center">
                  <p className="text-[11px] font-black uppercase tracking-widest text-gray-500 flex items-center justify-center gap-1.5 leading-tight">
                    🌐 Progreso Global ({c.pedido})
                  </p>
                  {fechaPed && horaPed && (
                    <p className="text-[9px] font-bold text-gray-400 mt-1">
                      📅 Programado: {fechaPed} a las ⏰ {horaPed}
                    </p>
                  )}
                </div>
                
                <div className="flex flex-col gap-2">
                  {CATALOGO_CONFIGURACIONES.map(conf => {
                    const metaAsignada = metaDelPedido ? metaDelPedido[conf.id] : 0;
                    const totalGavetasGlobal = datosDelPedidoGlobal.filter(d => d.tipo_palet === conf.palet_db || d.tipo_palet === conf.palet).reduce((s,d) => s + d.gavetas, 0);
                    const paletsCompletosGlobal = Math.floor(totalGavetasGlobal / conf.cajas);

                    if (metaAsignada > 0 || paletsCompletosGlobal > 0) {
                      const pct = metaAsignada > 0 ? Math.min((paletsCompletosGlobal / metaAsignada) * 100, 100) : 100;
                      return (
                        <div key={conf.id} className="bg-white p-2.5 rounded-xl border border-gray-200 shadow-inner hover:border-gray-300">
                          <div className="flex justify-between text-[10px] font-bold text-[#1C4D2E] mb-1.5 gap-2 leading-tight">
                            <div className="truncate flex-1">
                              {conf.cliente}<br/>
                              <span className="font-normal text-gray-500">Caja: {conf.caja}</span>
                            </div>
                            <div className="shrink-0 text-right">
                              <span className={`font-black text-xs ${paletsCompletosGlobal >= metaAsignada ? "text-green-600" : ""}`}>{paletsCompletosGlobal} Pal</span>
                              {metaAsignada > 0 && <span className="font-normal text-gray-400"> / {metaAsignada} Objetivo</span>}
                            </div>
                          </div>
                          {metaAsignada > 0 && (
                            <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden border">
                              <div className={`h-full transition-all duration-500 rounded-full ${paletsCompletosGlobal >= metaAsignada ? 'bg-green-500' : 'bg-amber-400'}`} style={{width: `${pct}%`}}></div>
                            </div>
                          )}
                        </div>
                      );
                    }
                    return null;
                  })}
                </div>
              </div>

            </div>
          );
        })}
      </div>

      {showLoginModal && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <form onSubmit={handleLogin} className="bg-white p-8 md:p-10 rounded-3xl w-full max-w-sm flex flex-col gap-5 shadow-[0_20px_60px_rgba(0,0,0,0.5)] border-t-8 border-[#1C4D2E]">
            <h2 className="text-2xl md:text-3xl font-black text-[#1C4D2E] tracking-tighter leading-tight">Acceso Supervisor</h2>
            <p className="text-xs text-gray-400 font-bold uppercase tracking-wider -mt-3">Credenciales de seguridad</p>
            <input type="text" placeholder="Usuario" required className="p-4 bg-white text-[#1C4D2E] rounded-xl border-2 border-gray-300 shadow-inner outline-none font-bold text-center text-sm focus:border-[#1C4D2E] focus:ring-1 focus:ring-[#1C4D2E] transition-colors" onChange={e => setCredenciales({...credenciales, usuario: e.target.value})} />
            <input type="password" placeholder="Contraseña" required className="p-4 bg-white text-[#1C4D2E] rounded-xl border-2 border-gray-300 shadow-inner outline-none font-bold text-center text-sm focus:border-[#1C4D2E] focus:ring-1 focus:ring-[#1C4D2E] transition-colors" onChange={e => setCredenciales({...credenciales, pass: e.target.value})} />
            <input type="text" placeholder="Tu Nómina" required className="p-4 bg-white text-[#1C4D2E] rounded-xl border-2 border-gray-300 shadow-inner outline-none font-bold text-center mt-2 text-sm focus:border-[#1C4D2E] focus:ring-1 focus:ring-[#1C4D2E] transition-colors" onChange={e => setCredenciales({...credenciales, nomina: e.target.value})} />
            <div className="flex gap-3 mt-4">
              <button type="button" onClick={() => setShowLoginModal(false)} className="w-1/3 py-4 bg-gray-200 text-gray-600 font-black rounded-xl text-sm active:scale-95 transition-transform">Cancelar</button>
              <button type="submit" className="w-2/3 py-4 bg-[#1C4D2E] hover:bg-[#153a22] text-white font-black rounded-xl text-sm active:scale-95 transition-transform shadow-md">Ingresar</button>
            </div>
          </form>
        </div>
      )}

      {showConfigModal && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <form onSubmit={guardarConfiguracionPedido} className="bg-white p-6 md:p-8 rounded-3xl w-full max-w-lg flex flex-col gap-4 shadow-[0_20px_60px_rgba(0,0,0,0.5)] max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-black text-[#1C4D2E] border-b-2 pb-2 tracking-tighter leading-tight">Planificar Meta de Pedido</h2>
            <p className="text-xs text-gray-400 font-bold uppercase tracking-wider -mt-1">Define los objetivos de Palets</p>
            
            <input type="text" placeholder="Número de Pedido Meta" required className="p-4 bg-white text-[#1C4D2E] rounded-xl border-2 border-[#1C4D2E] outline-none font-black text-xl text-center shadow-inner mt-2 mb-1 focus:ring-1 focus:ring-[#1C4D2E]" onChange={e => setNuevoPedido({...nuevoPedido, pedido: e.target.value})} />
            
            <div className="flex gap-3 mb-3">
              <div className="w-1/2">
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Fecha Programada</label>
                <input type="date" required className="w-full p-3 bg-white text-[#1C4D2E] rounded-xl border-2 border-gray-300 shadow-inner outline-none font-bold text-sm focus:border-[#1C4D2E]" onChange={e => setNuevoPedido({...nuevoPedido, fecha_programada: e.target.value})} />
              </div>
              <div className="w-1/2">
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Hora de Inicio</label>
                <input type="time" required className="w-full p-3 bg-white text-[#1C4D2E] rounded-xl border-2 border-gray-300 shadow-inner outline-none font-bold text-sm focus:border-[#1C4D2E]" onChange={e => setNuevoPedido({...nuevoPedido, hora_inicio: e.target.value})} />
              </div>
            </div>
            
            <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1 leading-tight">Digita cuántos <span className="font-black text-[#C22821]">Palets</span> necesitas por cada Cliente:</p>
            
            <div className="flex flex-col gap-2.5">
              {CATALOGO_CONFIGURACIONES.map(conf => (
                <div key={conf.id} className="flex justify-between items-center bg-gray-50 p-3 rounded-xl border border-gray-200 shadow-inner hover:border-gray-300">
                  <div className="w-2/3 pr-3 flex flex-col">
                    <span className="text-xs font-black text-[#1C4D2E] leading-tight truncate">{conf.cliente}</span>
                    <span className="text-[10px] text-gray-500 font-bold leading-tight">{conf.palet} | Caja: {conf.caja}</span>
                  </div>
                  <input type="number" min="0" placeholder="0" className="w-20 p-2.5 bg-white text-center font-black rounded-lg border-2 border-gray-300 shadow-inner text-[#1C4D2E] outline-none focus:border-[#1C4D2E] focus:ring-1 focus:ring-[#1C4D2E] transition-colors" onChange={e => handleMetasChange(conf.id, e.target.value)} />
                </div>
              ))}
            </div>
            
            <div className="flex gap-3 mt-5 sticky bottom-0 bg-white pt-3 border-t-2 border-dashed border-gray-200">
              <button type="button" onClick={() => setShowConfigModal(false)} className="w-1/3 py-4 bg-gray-200 text-gray-600 font-black rounded-xl text-sm active:scale-95 transition-transform">Cerrar</button>
              <button type="submit" className="w-2/3 py-4 bg-[#C22821] hover:bg-red-800 text-white font-black rounded-xl text-sm active:scale-95 transition-transform shadow-md">Lanzar Meta a Cuadrillas</button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}