import { NextResponse } from 'next/server';
import mongoose from 'mongoose';

const PedidoSchema = new mongoose.Schema({
  pedido: String,
  supervisor_nomina: String,
  fecha_programada: String, // NUEVO: Para los reportes
  hora_inicio: String,      // NUEVO: Para los reportes
  metas: Object, 
}, { timestamps: true });

const AlertaSchema = new mongoose.Schema({
  nombre_paletero: String,
  nomina_paletero: String,
  pedido: String,
  material: String,
  cantidad: Number,
  estado: { type: String, default: 'pendiente' }
}, { timestamps: true });

const Pedido = mongoose.models.PedidoPrimaflor || mongoose.model('PedidoPrimaflor', PedidoSchema);
const Alerta = mongoose.models.AlertaPrimaflor || mongoose.model('AlertaPrimaflor', AlertaSchema);

const connectDB = async () => {
  if (mongoose.connection.readyState >= 1) return;
  await mongoose.connect(process.env.MONGODB_URI);
};

export async function GET(req) {
  await connectDB();
  const { searchParams } = new URL(req.url);
  const tipo = searchParams.get('tipo');

  if (tipo === 'alertas') {
    const alertas = await Alerta.find({ estado: 'pendiente' }).sort({ createdAt: -1 });
    return NextResponse.json({ success: true, data: alertas });
  }

  const pedido_id = searchParams.get('pedido');
  if (pedido_id) {
    const data = await Pedido.findOne({ pedido: pedido_id });
    return NextResponse.json({ success: true, data });
  }
  
  return NextResponse.json({ success: false, message: 'Falta parámetro' });
}

export async function POST(req) {
  await connectDB();
  const body = await req.json();

  if (body.tipo === 'crear_pedido') {
    const configPedido = await Pedido.findOneAndUpdate(
      { pedido: body.data.pedido },
      { $set: body.data },
      { new: true, upsert: true }
    );
    return NextResponse.json({ success: true, data: configPedido });
  }

  if (body.tipo === 'crear_alerta') {
    const nuevaAlerta = await Alerta.create(body.data);
    return NextResponse.json({ success: true, data: nuevaAlerta });
  }

  if (body.tipo === 'resolver_alerta') {
    await Alerta.findByIdAndUpdate(body.id, { estado: 'resuelta' });
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ success: false });
}